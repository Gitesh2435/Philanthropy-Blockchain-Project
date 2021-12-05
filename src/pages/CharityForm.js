import React, { useEffect, useState } from 'react'
import { useHistory } from 'react-router';
import Navbar from '../components/Navbar';
import './CharityForm.css'
import cardImage from '../components/sample/india_flood.jpeg'
import charityDefaultImage from '../components/sample/flood.jpg'
import { initializeApp } from "firebase/app";
import firebaseConfig from "../config/firebaseConfig";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import Web3 from 'web3';
import Donations from '../contracts/Donations.json';
import Dropdown from '../components/Dropdown';

export default function CharityForm(props) {

    const [size, setsize] = useState(5)

    const firebaseApp = initializeApp(firebaseConfig);
    const firebaseStorage = getStorage(firebaseApp);

    const history = useHistory();

    const event = props.location.state.button_name
    const info = props.location.state.info

    const [credentialCharity, setCredentialCharity] = useState({
        charityName: info.title || "",
        description: info.description || "",
        previousWork: info.previousWork || "",
        cause: info.cause || "",
        goal: info.goal || 0,
        city: info.city || "",
        state: info.state || "",
        imageURL: info.imageURL || "",
        externalURL: info.externalURL || ""
    })

    //cover-image
    const [img, setImg] = useState(cardImage)
    const [coverImageUpload, setCoverImageUpload] = useState(false)

    //charity images for carousel
    const [charityImages, setCharityImages] = useState([charityDefaultImage])
    const [charityImgsUpload, setCharityImgsUpload] = useState(false)

    const coverImageHandler = (e) => {
        try {
            let file = e.target.files[0];
            setImg(file);
            setCoverImageUpload(true)
        } catch (error) {
            console.error(error.message)
        }
    }

    const imagesHandler = (e) => {
        try {
            let length = e.target.files.length
            let imageArray = []
            for (let i = 0; i < length; i++) {
                let file = e.target.files[i]
                imageArray.push(file)
            }
            setCharityImages(imageArray)
            setCharityImgsUpload(true)
        } catch (err) {
            console.error(err.message)
        }
    }

    useEffect(() => {
        // To reflect changes in the state of coverImageUpload and charityImgsUpload
        console.log("update cover image:" + coverImageUpload)
        console.log("update carousel images: " + charityImgsUpload)
        loadBlockChain()
    }, [coverImageUpload, charityImgsUpload])

    const onChangeCharity = async (e) => {
        setCredentialCharity({
            ...credentialCharity, [e.target.name]: e.target.value
        })
    }

    const onSubmitCharity = async (e) => {
        e.preventDefault();
        try {
            if (event === "Add New") {
                const url = "http://localhost:5000/api/charity/createcharity"
                //eslint-disable-next-line
                const response = await fetch(url,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            charityName: credentialCharity.charityName,
                            description: credentialCharity.description,
                            previousWork: credentialCharity.previousWork,
                            cause: credentialCharity.cause,
                            goal: credentialCharity.goal,
                            city: credentialCharity.city,
                            state: credentialCharity.state,
                            imageURL: credentialCharity.imageURL,
                            externalURL: credentialCharity.externalURL
                        })
                    }
                );
                createCharity(credentialCharity.charityName)
            }
            else if (event === "update") {
                console.log(credentialCharity)
                const url = "http://localhost:5000/api/charity/updatecharity/" + info.id;
                //eslint-disable-next-line
                const response = await fetch(url,
                    {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            charityName: credentialCharity.charityName,
                            description: credentialCharity.description,
                            previousWork: credentialCharity.previousWork,
                            cause: credentialCharity.cause,
                            goal: credentialCharity.goal,
                            city: credentialCharity.city,
                            state: credentialCharity.state,
                            imageURL: credentialCharity.imageURL,
                            externalURL: credentialCharity.externalURL
                        })
                    }
                );
            }

            if (coverImageUpload) {
                let coverImgRef = ref(firebaseStorage, `charitycover/${credentialCharity.charityName}`);
                uploadBytes(coverImgRef, img).then(() => {
                    console.log('cover image Uploaded!');
                });
            }

            if (charityImgsUpload) {
                for (let i = 0; i < charityImages.length; i++) {
                    let charityImgsRef = ref(firebaseStorage, `charityimages/${credentialCharity.charityName}/${i}`);
                    uploadBytes(charityImgsRef, charityImages[i]).then(() => {
                        console.log('images Uploaded!');
                    });
                }
            }

            history.go(-1)
        } catch (error) {
            console.error(error.message)
        }
    }

    // Blockchain Code

    const [account, setAccount] = useState("");
    const [contract, setContract] = useState(null);
    const [count, setCount] = useState(0);

    async function loadBlockChain() {
        const web3 = new Web3(Web3.currentProvider || "http://localhost:7545");

        const networkId = await web3.eth.net.getId()
        const networkData = Donations.networks[networkId]
        console.log(networkId, networkData)

        if (networkData) {
            const donations = new web3.eth.Contract(Donations.abi, networkData.address)
            const charityCount = await donations.methods.count().call()
            setContract(donations)
            setCount(charityCount)
            console.log(charityCount)
        } else {
            window.alert('Donations contract not deployed to detected network.')
        }

        const accounts = await web3.eth.getAccounts();
        setAccount(accounts[0]);
        console.log(accounts[0]);
    }

    const createCharity = (name) => {
        contract.methods.createCharity(name).send({ from: account, gas: 1000000 })
            .once('receipt', (receipt) => {
                console.log(receipt)
            })
    }

    return (
        <>
            <Navbar />
            <div className="cf-container charity-form">
                <div className="cf-container_det">
                    <div className="cf-title">Charity Form</div>
                    <div className="cf-content">
                        <form onSubmit={onSubmitCharity} onChange={onChangeCharity}>
                            <div className="user-details">
                                <div className="input-box" style={{ width: "100%" }}>
                                    <span className="details">Charity Name</span>
                                    <input type="text" name="charityName" placeholder="Enter Charity Name" defaultValue={info.title || ""} required />
                                </div>
                                <div className="input-box" style={{ width: "100%" }}>
                                    <span className="details">Cause</span>
                                    <div className="select">
                                        <select className="form-select select-box select-wrapper"  required>
                                        <option selected>Select</option>
                                        <option value="1">Flood</option>
                                        <option value="2">old aged people</option>
                                        <option value="3">child</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="input-box" style={{ width: "100%" }}>
                                    <span className="details">Description</span>
                                    <textarea type="text" name="description" rows="3" placeholder="Enter description" defaultValue={info.description || ""} required style={{ fontSize: "13px" }}></textarea>
                                </div>
                                <div className="input-box" style={{ width: "100%" }}>
                                    <span className="details">Notable Work</span>
                                    <textarea type="text" name="previousWork" rows="3" placeholder="Enter Notable Work" defaultValue={info.previousWork || ""} style={{ fontSize: "13px" }}></textarea>
                                </div>
                                <div className="input-box">
                                    <span className="details">City</span>
                                    <input type="text" name="city" placeholder="Enter City" defaultValue={info.city || ""} required />
                                </div>
                                <div className="input-box">
                                    <span className="details">State</span>
                                    <div >
                                        <select className="form-select select-box" required>  
                                            <option selected>Select</option>
                                            <option value="1">Andhra Pradesh</option>
                                            <option value="2">Arunachal Pradesh</option>
                                            <option value="3">Assam</option>
                                            <option value="4">Bihar</option>
                                            <option value="5">Chhattisgarh</option>
                                            <option value="6">Goa</option>
                                            <option value="7">Gujarat</option>
                                            <option value="8">Haryana</option>
                                            <option value="9">Himachal Pradesh</option>
                                            <option value="10">Jammu and Kashmir</option>
                                            <option value="11">Jharkhand</option>
                                            <option value="12">Karnataka</option>
                                            <option value="13">Kerala</option>
                                            <option value="14">Madhya Pradesh</option>
                                            <option value="15">Maharashtra</option>
                                            <option value="16">Manipur</option>
                                            <option value="17">Meghalaya</option>
                                            <option value="18">Mizoram</option>
                                            <option value="19">Nagaland</option>
                                            <option value="20">Odisha</option>
                                            <option value="21">Punjab</option>
                                            <option value="22">Rajasthan</option>
                                            <option value="23">Sikkim</option>
                                            <option value="24">Tamil Nadu</option>
                                            <option value="25">Telangana</option>
                                            <option value="26">Tripura</option>
                                            <option value="27">Uttar Pradesh</option>
                                            <option value="28">Uttarakhand</option>
                                            <option value="29">West Bengal</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="input-box" style={{ width: "100%" }}>
                                    <span className="details">Goal</span>
                                    <input type="number" name="goal" placeholder="Enter goal amount" defaultValue={info.goal || ""} required />
                                </div>
                                <div className="input-box">
                                    <div className="details">Select Cover Image</div>
                                    <label htmlFor="cover-img-upload" className="custom-file-upload">
                                        <i className="fa fa-cloud-upload"></i>  Upload Cover Image
                                    </label>
                                    <input id="cover-img-upload" accept="image/*" name="imageURL" type="file" onChange={coverImageHandler} style={{ display: "none" }} />
                                </div>
                                <div className="input-box">
                                    <span className="details">Select Charity Images</span>
                                    <label htmlFor="img-upload" className="custom-file-upload">
                                        <i className="fa fa-cloud-upload"></i>  Upload Charity Images
                                    </label>
                                    <input id="img-upload" accept="image/*" name="imageURL" type="file" onChange={imagesHandler} multiple="multiple" style={{ display: "none" }} />
                                </div>
                            </div>
                            <div className="button">
                                <input type="submit" defaultValue={props.button_name} />
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    )
}

// Issue: When you add new charity - if quickly go to zone page - it tries to load image from firebase when it is not even completely uploaded on firebase - results in default image being loaded and red warning in console