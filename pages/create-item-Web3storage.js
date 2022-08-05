import React from 'react';
import { useState } from 'react'
import { ethers } from 'ethers'
import { useRouter } from 'next/router'
import {Web3Storage} from 'web3.storage';

//import {NFTStorage} from 'nft.storage';
import {
  nftaddress, nftmarketaddress
} from '../config'
import NFT from '../artifacts/contracts/NFT.sol/NFT.json'
import Market from '../artifacts/contracts/NFTMarket.sol/NFTMarket.json'


export default function Web3StorageExample () {
  const [fileUrl, setFileUrl] = useState(null)
  const [file, setFile] = useState(null)
  const [isLoading, setisLoading] = useState(null)


  const [formInput, updateFormInput] = useState({ price: '', name: '', description: '' })
  const router = useRouter()

function getAccessToken () {
  // If you're just testing, you can paste in a token
  // and uncomment the following line:
  // return 'paste-your-token-here'

  // In a real app, it's better to read an access token from an
  // environement variable or other configuration that's kept outside of
  // your code base. For this to work, you need to set the
  // WEB3STORAGE_TOKEN environment variable before you run your code.
  const token = REACT_APP_WEB3STORAGE_TOKEN;
  return token;
};

function makeStorageClient () {
  return new Web3Storage({ token: getAccessToken() })
};

function getFiles () {
        const fileInput = document.querySelector('input[type="file"]')
        return fileInput.files
};

async function storeWithProgress (files) {
    // show the root cid as soon as it's ready
    const onRootCidReady = cid => {
      console.log('uploading files with cid:', cid)
    }

    let fileList = [files];
    // when each chunk is stored, update the percentage complete and display
    const totalSize = fileList.map(f => f.size).reduce((a, b) => a + b, 0)
    let uploaded = 0
  
    const onStoredChunk = size => {
      uploaded += size
      const pct = 100 * (uploaded / totalSize)
      console.log(`Uploading... ${pct.toFixed(2)}% complete`)
    }
  
    // makeStorageClient returns an authorized Web3.Storage client instance
    const client = makeStorageClient();
  
    // client.put will invoke our callbacks during the upload
    // and return the root cid when the upload completes
    return client.put(fileList, { onRootCidReady, onStoredChunk })
  }

  async function onChange() {
    try {
    const file2 = getFiles();
    setFile(file2[0]);
    console.log(file2);
    }catch(error) {
      console.log('Error uploading file: ', error)
    } 
  }
  
  async function createMarket() {
    setisLoading("Creating NFt Token. Pleas wait for the Transaction.");
    const { name, description, price } = formInput;
    if (!name || !description || !price || !file) return
    const cidOfFile = await storeWithProgress(file)
    const filesUrl = "https://ipfs.io/ipfs/" +cidOfFile +"/"+file.name;
    setFileUrl(filesUrl);
    /* first, upload to IPFS */
    const data = JSON.stringify({
      name, description, image: filesUrl
    })
    const blob = new Blob([data], { type: 'application/json' })
    const files = [new File([blob], 'Nft.json')]
    try {
      const cidOfNft = await (await storeWithProgress(files[0]))
      console.log(cidOfNft);
      const url = "https://ipfs.io/ipfs/" +cidOfNft.toString()+"/Nft.json";
      /* after file is uploaded to IPFS, pass the URL to save it on Polygon */
      console.log(url);
      await createSale(url);
      setisLoading(null);
    }catch (error) {
      console.log('Error uploading file: ', error)
      setisLoading(null);
    }  
  }

  async function createSale(url) {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner()

    /* next, create the item */
    let nftContract = new ethers.Contract(nftaddress, NFT.abi, signer)
    let transaction = await nftContract.createToken(url)
    let tx = await transaction.wait()
    let event = tx.events[0]
    let value = event.args[2]
    let tokenId = value.toNumber();

    setisLoading("Nft Token Created with Id: "+tokenId+". Please wait for the market sale to finish!");
    console.log("Entering market zone",tokenId);
    /* then list the item for sale on the marketplace */
    let marketContract = new ethers.Contract(nftmarketaddress, Market.abi, signer)
    let listingPrice = await marketContract.getListingPrice()
    listingPrice = listingPrice.toString();
    const price = ethers.utils.parseUnits(formInput.price, 'ether')
    transaction = await marketContract.createMarketItem(nftaddress, tokenId, price, { value: listingPrice })
    await transaction.wait()
    router.push('/')
  }

return ( <>
{isLoading && <div className='container'><h1>{isLoading}</h1></div>}
{!isLoading && <>
  <div className='flex justify-center'>
<div className="w-1/2 flex flex-col pb-12">
<p className='text-2xl font-bold'>Create using Web3.Storage and Sell Digital Asset</p>
</div>
</div>
<div className="flex justify-center">
<div className="w-1/2 flex flex-col pb-12">
  <input 
    placeholder="Asset Name"
    className="mt-8 border rounded p-4"
    onChange={e => updateFormInput({ ...formInput, name: e.target.value })}
  />
  <textarea
    placeholder="Asset Description"
    className="mt-2 border rounded p-4"
    onChange={e => updateFormInput({ ...formInput, description: e.target.value })}
  />
  <input
    placeholder="Asset Price in Eth"
    className="mt-2 border rounded p-4"
    onChange={e => updateFormInput({ ...formInput, price: e.target.value })}
  />
  <input 
    type="file"
    name="Asset"
    className="my-4"
    onChange={onChange}
  />
  {
    fileUrl && <>
      <img className="rounded mt-4" width="350" src={fileUrl} />
    </>
  }
  <button onClick={createMarket} className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg">
    Create Digital Asset
  </button>
</div>
</div></>}
</>)
}