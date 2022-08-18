import React, { useEffect, useState } from "react";
import logo from "../../assets/logo.png";
import { HttpAgent, Actor } from "@dfinity/agent";
import { idlFactory } from "../../../declarations/nft";
import { idlFactory as tokenIdlFactory } from "../../../declarations/token";
import { Principal } from "@dfinity/principal";
import Button from "./Button";
import { opend } from "../../../declarations/opend";
import CURRENT_USER_ID from "../index";
import PriceLabel from "./PriceLabel";
import { token } from "../../../declarations/token/index";

function Item(props) {

  const [name, setName] = useState();
  const [userId, setId] = useState();
  const [image, setImage] = useState();
  const [button, setButton] = useState();
  const [input, setInput] = useState();
  const [loaderHidden, setHidden] = useState(true);
  const [blur, setBlur] = useState();
  const [sellStatus, setSellStatus] = useState();
  const [priceLabel, setPriceLabel] = useState();
  const [shouldDisplay, setDisplay] = useState(true);

  let NFTActor;

  const id = props.id;

  const localHost = "http://localhost:8080/";
  const agent = new HttpAgent({ host: localHost });
  agent.fetchRootKey();

  let price;

  function handleSell() {
    console.log("clicked");
    setInput(<input
      placeholder="Price in DANG"
      type="number"
      className="price-input"
      value={price}
      onChange={(e) => {
        price = e.target.value;
      }}
    />);
    setButton(<Button handleClick={sellItems} text={"Confirm"} />);
  }

  async function sellItems() {
    setBlur({ filter: "blur(4px)" });
    setHidden(false);
    console.log("Sell price = " + price);
    const listingResult = await opend.listItem(props.id, Number(price));
    console.log("Listing Result :" + listingResult);
    if (listingResult == "Success") {
      const openDId = await opend.getOpenDCanisterID();
      const transferResult = await NFTActor.transferOwner(openDId);
      console.log("transfer: " + transferResult);
      if (transferResult == "Success") {
        setHidden(true);
        setButton();
        setInput();
        setId("OpenD");
        setSellStatus("Listed");
      }
    }
  }

  async function loadNFT() {
    NFTActor = await Actor.createActor(idlFactory, {
      canisterId: id,
      agent,
    });

    const fullName = await NFTActor.getName();
    const getOwner = await NFTActor.getOwner();
    const imageData = await NFTActor.getContent();
    const imageContent = new Uint8Array(imageData);
    const image = URL.createObjectURL(new Blob([imageContent.buffer], { type: "image/png" }));

    setName(fullName);
    setId(getOwner.toText());
    setImage(image);

    if (props.role == "collection") {
      const nftIsListed = await opend.isListed(props.id);
      if (nftIsListed) {
        setBlur({ filter: "blur(4px)" });
        setId("OpenD");
        setSellStatus("Listed");
      } else {
        setButton(<Button handleClick={handleSell} text={"Sell"} />);
      }
    } else if(props.role == "discover"){
      const originalOwner = await opend.getOriginalOwner(id);

      if (originalOwner.toText() != CURRENT_USER_ID.toText()){
        setButton(<Button handleClick={handleBuy} text={"Buy"} />);
      }
      
      const itemPrice = await opend.getListingPrice(id);
      setPriceLabel(<PriceLabel sellPrice = {itemPrice.toString()}/>)
    }
  }

  async function handleBuy(){
    setHidden(false);
    console.log("Buy Clicked");
    const tokenActor = await Actor.createActor(tokenIdlFactory, {
      agent,
      canisterId: Principal.fromText("s24we-diaaa-aaaaa-aaaka-cai"),
    });

    const sellerId = await opend.getOriginalOwner(props.id);
    const itemCurrentPrice = await opend.getListingPrice(id);

    const result = await tokenActor.transfer(sellerId, itemCurrentPrice);
    console.log(result);

    if (result == "Success") {
      const purchaseResult = await opend.completePurchase(id, sellerId, CURRENT_USER_ID);
      console.log("PurChase : " + purchaseResult);
      setHidden(true);
      setDisplay(false);
    }

    

  }

  useEffect(() => {
    loadNFT();
  }, []);

  return (
    <div style={{display : shouldDisplay ? "inline" : "none"}} className="disGrid-item">
      <div className="disPaper-root disCard-root makeStyles-root-17 disPaper-elevation1 disPaper-rounded">
        <img
          className="disCardMedia-root makeStyles-image-19 disCardMedia-media disCardMedia-img"
          src={image}
          style={blur}
        />
        <div className="lds-ellipsis" hidden={loaderHidden}>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div className="disCardContent-root">
        {priceLabel}
          <h2 className="disTypography-root makeStyles-bodyText-24 disTypography-h5 disTypography-gutterBottom">
            {name}<span className="purple-text"> {sellStatus}</span>
          </h2>
          <p className="disTypography-root makeStyles-bodyText-24 disTypography-body2 disTypography-colorTextSecondary">
            Owner : {userId}
          </p>
          {input}
          {button}
        </div>
      </div>
    </div>
  );
}

export default Item;
