import React, { useEffect, useState,useRef } from 'react'
import { useHistory } from 'react-router';
import { Link } from 'react-router-dom';
import { initializeApp } from "firebase/app";
import firebaseConfig from "../config/firebaseConfig";
import { getStorage, ref, deleteObject, listAll } from "firebase/storage";
import Web3 from 'web3';
import Donations from '../contracts/Donations.json';


export default function HeroElement(props) {
    // eslint-disable-next-line
    const {id, title, cause, description, previousWork, goal, fundsRaised, walletAddress, isVerified} = props
    const history = useHistory()
    const firebaseApp = initializeApp(firebaseConfig)
    const firebaseStorage = getStorage(firebaseApp)

    const donationModalToggle = useRef();
    const [donAmount, setdonAmount] = useState(0);

    const [stats, setStats] = useState({
        stat1: 'More than a third of the world’s malnourished children live in India',
        stat2: 'More than 2/3rds deaths of under-fives attributed to malnutrition',
        stat3: '95.1M children deprived of midday meals at school during COVID-19'
    })

    const [contractBalance, setContractBalance] = useState(0)

    const deleteCharity = async() => {
        try {
            const url = "http://localhost:5000/api/charity/deletecharity/" + id;
            //eslint-disable-next-line
            const response = await fetch(url,
                {
                    method: 'DELETE', 
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            //Delete cover image from firebase storage
            const delRef = ref(firebaseStorage, `charitycover/${title}`)
            deleteObject(delRef).then(() => {
                console.log("cover image deleted from firebase")
            }).catch((error) => {
                console.error(error)
            })

            //Delete carousel images from firebase storage
            const listRef = ref(firebaseStorage, `charityimages/${title}`);
            listAll(listRef).then((res) => {
                res.items.map((imageRef) => deleteObject(imageRef))
            }).catch((error) => {
                console.error(error)
            });

            history.go(-1)
        } catch (error) {
            console.error(error.message)
        }
    }

    const getStats = async() => {
        try {
            const url = "http://localhost:5000/api/stats/fetchstats"
            const response = await fetch(url, {
                method: 'GET', 
                headers: {
                    'Content-Type': 'application/json',
                    'accept':'application/json',
                    'cause': `${cause}`
                }
            });
            const data = await response.json();
            setStats(data[0])
            // console.log(data[0])
        } catch(error) {
            console.log(error)
        }
    }

    useEffect(() => {
        getStats()
    }, [])

    const updateFunds = async(amount) => {
        const url = "http://localhost:5000/api/charity/updatecharity/" + id;
        //eslint-disable-next-line
        const response = await fetch(url,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fundsRaised: fundsRaised + amount
                })
            }
        );
    }

    // Blockchain Code

    const [account, setAccount] = useState("");
    const [contract, setContract] = useState(null);
    let web3;
    async function loadBlockChain() {
        //const web3 = new Web3(Web3.currentProvider || "http://localhost:7545");
        
        if(window.ethereum) {
            console.log('metamask exists')
            web3 = new Web3(window.ethereum);
            await window.ethereum.enable();
        }
        else if(window.web3) {
            web3 = new Web3(Web3.currentProvider || "http://localhost:7545");
        }
        const networkId = await web3.eth.net.getId()
        const networkData = Donations.networks[networkId]
        console.log("networkId: ", networkId, "networkData :", networkData)
        
        if(networkData) {
            const donations = new web3.eth.Contract(Donations.abi, networkData.address)
            setContract(donations)
        } else {
            window.alert('Donations contract not deployed to detected network.')
        }
        const accounts = await web3.eth.getAccounts();
        setAccount(accounts[0]);
        console.log("Metamask account Address :", accounts[0]);
    }

    //const handleDonation = () => {
    //    makeDonation(title, Web3.utils.toWei('3', 'Ether'))
    //}
    
    const makeDonation = (id, amount) => {
        console.log('isVerified: ', isVerified)
        if(isVerified == true) {
            let web3js = new Web3(window.web3.currentProvider); 
            web3js.eth.sendTransaction({
                from: account,
                to: walletAddress,
                value: Web3.utils.toWei(donAmount, 'Ether')
            })
            .then(function(receipt){
                console.log(receipt)
                updateFunds(5)
            });
        } else {
            contract.methods.updateAmount(id).send({from:account, value: amount, gas: 1000000})
            .once('receipt', (receipt) => {
                console.log(receipt)
                setContractBalance(contractBalance + 3)
                getBalance()
            })
        }
    }

    const handleTransfer = () => {
        transferAmount()
    }

    const transferAmount = () => {
        contract.methods.transferAmount(walletAddress, title).send({from: account})
        .once('receipt', (receipt) => {
            console.log(receipt)
            updateFunds(contractBalance)
        })
    }

    const handleRevert = () => {
        revertAmount()
    }

    const revertAmount = () => {
        contract.methods.revertAmount(title).send({from: account})
        .once('receipt', (receipt) => {
            console.log(receipt)
            setContractBalance(0)
        })
    }

    const getBalance = () => {
        const bal = contract.methods.getBalance(title).call()
        bal.then((res) => {
            console.log(res)
        })
    }
    //BLockChain code END ------------


    const openModal = ()=>{
        console.log('modal open');
        donationModalToggle.current.click();
    }
    const rangeOnChange = (e)=>{
        setdonAmount(e.target.value)
        console.log(e.target.value)
    }

    useEffect(() => {
        loadBlockChain();
    }, [])

    return (
        // section-1 charity info
        <div className="container hero-container">
            


            {/* Donatin button hidden */}
            <button type="button" ref={donationModalToggle} className="btn btn-primary d-none" data-bs-toggle="modal" data-bs-target="#staticBackdrop">
            Launch static backdrop modal
            </button>

            {/* Donation modal */}
            <div className="modal" id="staticBackdrop" data-bs-backdrop="static" data-bs-keyboard="false" tabIndex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
            <div className="modal-dialog">
                <div className="modal-content" style={{borderRadius:"0px"}}>
                <div className="modal-header">
                    <h5 className="modal-title " id="staticBackdropLabel">Donate</h5>
                    <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div className="modal-body">
                    <div><h6>From:</h6>{ account }</div>
                    <div><h6>To:</h6> {walletAddress} </div>
                    <div className="mt-4"><h6>Value {donAmount} </h6>  </div>
                    
                    <input type="range" className="form-range" min="0" max="10" step="0.0001" id="customRange1" onChange={rangeOnChange} ></input>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Reject</button>
                    <button type="button" onClick={makeDonation} className="btn btn-primary">Confirm</button>
                </div>
                </div>
            </div>
            </div>
             




            <div className="row my-5 p-2">
                <div className="col-lg-7 col-md-7">
                    <h2 className="featurette-heading">{title}</h2>
                    <p className="lead hero-ele-charity-description">{description}</p>
                </div>
                <div className="col-lg-5 col-md-5">
                    <img className="mx-auto hero-img" src="https://source.unsplash.com/420x380/?charity"/>
                </div>
            </div>
            
            {/* section-2 Stats */}
            <div className="container hero-container" >
                <div className="row p-4 align-items-center border shadow-lg">
                    <div className="col-lg-7 col-md-7 p-3 p-lg-5">
                        <h2 className="lh-1">Some Statistics</h2>
                        <p className="lead hero-text">Quickly design and customize responsive mobile-first sites with Bootstrap.</p>
                        <div className="row">
                            <div className="col-lg-4 col-md-12">
                                <div className="details-container">
                                    <div className="details-title"><img  className="rounded mx-auto d-block pb-1" src="https://give-marketplace-dev.s3.ap-south-1.amazonaws.com/static/images/home/homev2/Mission+10+Million+Meals/Homepage%2Bicons_A.png" alt="" height="100px" width="100px" /></div>
                                    <p className="details-text">{stats && stats.stat1 || 'More than a third of the world’s malnourished children live in India'}</p>
                                </div>
                            </div>
                            <div className="col-lg-4 col-md-12">
                                <div className="details-container">
                                    <div className="details-title"><img  className="rounded mx-auto d-block pb-1" src="https://give-marketplace-dev.s3.ap-south-1.amazonaws.com/static/images/home/homev2/Mission+10+Million+Meals/Homepage%2Bicons_B.png" alt="" height="100px" width="100px"/></div>
                                    <p className="details-text">{stats && stats.stat2 || 'More than 2/3rds deaths of under-fives attributed to malnutrition'}</p>
                                </div>
                            </div>
                            <div className="col-lg-4 col-md-12">
                                <div className="details-container">
                                    <div className="details-title"><img  className="rounded mx-auto d-block pb-1" src="https://give-marketplace-dev.s3.ap-south-1.amazonaws.com/static/images/home/homev2/Mission+10+Million+Meals/impactmidday+mea.png" alt="" height="100px" width="100px"/></div>
                                    <p className="details-text">{stats && stats.stat3 || '95.1M children deprived of midday meals at school during COVID-19'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="d-grid gap-2 d-md-flex justify-content-md-start mb-4 mb-lg-3">
                            <button type="button" onClick={openModal} className="btn btn-primary btn-lg px-4 me-md-2 fw-bold">Donate</button>
                            <button type="button" onClick={handleTransfer} className="btn btn-success btn-lg px-4 me-md-2 fw-bold">Transfer</button>
                            <button type="button" onClick={handleRevert} className="btn btn-danger btn-lg px-4 me-md-2 fw-bold">Revert</button>
                        </div>
                    </div>
                    <div className="col-lg-5 col-md-5 shadow-lg p-2">
                        <img className="image-fluid hero-img" src="https://source.unsplash.com/420x380/?technology" alt="" />
                    </div>
                </div>
            </div>

            {/* section-3 more charity info */}
            <div className="container hero-container">
                <div className="row my-5">
                    <div className="col-lg-7 col-md-7 order-2">
                        <h2 className="featurette-heading">Some Notable Work </h2>
                        <p className="lead">{previousWork}</p>
                    </div>
                    <div className="col-lg-5 col-md-5 order-1">
                        <img  className="hero-img" src="https://source.unsplash.com/420x380/?charity,help" />
                    </div>
                </div>
            </div>

            {/* Admin Buttons */}
            <div className="d-grid gap-2 d-md-flex justify-content-md-start mb-4 mb-lg-3 charity-details-admin-buttons">
                <Link to={{pathname:"/charityform", state:{button_name:"update", info:props}}} type="button" className="btn btn-success btn-lg px-4 me-md-2 fw-bold">Update</Link>
                <button onClick={deleteCharity} type="button" className="btn btn-danger btn-lg px-4 me-md-2 fw-bold">Delete</button>
            </div>
        </div>
    )
}
