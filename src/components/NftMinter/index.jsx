import { Button } from "@mui/material";
import { Xumm } from "xumm";
import "./index.css";
import { useEffect, useState } from "react";
import { Buffer } from "buffer";
import { XrplClient } from "xrpl-client";
import { NFTStorage } from "nft.storage";
const xumm = new Xumm("dbc39240-4cee-4d52-9ea6-e99de0e73eba");
const nftStorage = new NFTStorage({
  token:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweGM2NzRDNjcwNTBFYzA0MzljN2JiNzhGMzllNjdGZGRFZWZEZkMwMjUiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY5NjYzNTMyODcwMiwibmFtZSI6IlhSUEwtTkZULU1ha2VyIn0.r8vUwAFahKWH-CbinP2fd4UeT1N3YbnyD256H-N7P_Q",
});

export const NftMinter = () => {
  const [account, setAccount] = useState(undefined);
  const [file, setFile] = useState(undefined);

  useEffect(() => {
    xumm.on("success", async () => {
      setAccount(await xumm.user.account);
    });
  }, []);

  const connect = () => {
    xumm.authorize();
  };

  const uploadImage = (e) => {
    const files = e.target.files;
    setFile(files[0]);
  };

  const mint = async () => {
    if (!file) {
      alert("画像ファイルを選択してください！");
      return;
    }
    // 画像とメタデータをIPFSにアップロード
    const { url } = await nftStorage.store({
      schema: "ipfs://QmNpi8rcXEkohca8iXu7zysKKSJYqCvBJn3xJwga8jXqWU",
      nftType: "art.v0",
      image: file,
      name: "fish",
      description: "jump fish",
    });
    // Xummにトランザクションデータを送信
    const payload = await xumm.payload.createAndSubscribe({
      TransactionType: "NFTokenMint",
      NFTokenTaxon: 0,
      Flags: 8,
      URI: Buffer.from(url).toString("hex"),
    });
    payload.websocket.onmessage = (msg) => {
      const data = JSON.parse(msg.data.toString());
      // トランザクションへの署名が完了/拒否されたらresolve
      if (typeof data.signed === "boolean") {
        payload.resolve({ signed: data.signed, txid: data.txid });
      }
    };
    // resolveされるまで待機
    const { signed, txid } = await payload.resolved;
    if (!signed) {
      alert("トランザクションへの署名は拒否されました！");
      return;
    }
    // テストネットからトランザクションの情報を取得
    const client = new XrplClient("wss://testnet.xrpl-labs.com");
    const txResponse = await client.send({
      command: "tx",
      transaction: txid,
    });
    // トランザクション情報からNFTの情報を取得
    const nftokenId = txResponse.meta.nftoken_id;
    alert("NFTトークンが発行されました！");
    window.open(`https://test.bithomp.com/nft/${nftokenId}`, "_blank");
  };

  return (
    <div className="nft-minter-box">
      <div className="title">XRP NFT</div>
      <div className="account-box">
        <div className="account">{account}</div>
        <Button variant="contained" onClick={connect}>
          connect
        </Button>
      </div>
      <div className="image-box">
        <Button variant="contained" onChange={uploadImage}>
          ファイルを選択
          <input
            className="imageInput"
            type="file"
            accept=".jpg , .jpeg , .png"
          />
        </Button>
      </div>
      {file && (
        <img
          src={window.URL.createObjectURL(file)}
          alt="nft"
          className="nft-image"
        />
      )}
      {account && (
        <div>
          <Button variant="outlined" onClick={mint}>
            mint
          </Button>
        </div>
      )}
    </div>
  );
};
