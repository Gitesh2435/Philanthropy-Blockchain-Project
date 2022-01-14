import React, { useEffect, useState, useRef, useContext } from 'react'
import { useHistory } from 'react-router';
import { Link } from 'react-router-dom';
import { initializeApp } from "firebase/app";
import firebaseConfig from "../config/firebaseConfig";
import { getStorage, ref, deleteObject, listAll } from "firebase/storage";
import Web3 from 'web3';
import Donations from '../contracts/Donations.json';
import userContext from '../context/User/userContext';
import DonationHistoryItem from './DonationHistoryItem';
import PendingDonationsItem from './PendingDonationsItem';
import Bluetick from './icons/check.png';
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
//import { useHistory } from 'react-router'

export default function HeroElement(props) {
    // eslint-disable-next-line
    const {id, title, cause, description, previousWork, goal, fundsRaised, walletAddress, isVerified, donationHistory} = props
    const history = useHistory()
    const firebaseApp = initializeApp(firebaseConfig)
    const firebaseStorage = getStorage(firebaseApp)

    const donationModalToggle = useRef();
    const receiptModalToggle = useRef();
    const logOutModalToggle = useRef();
    const donationHistoryModalToggle = useRef();
    const pendingDonationsModalToggle = useRef();
    const [donAmount, setdonAmount] = useState(0);
    const context = useContext(userContext);
    const { logOutUser, getProfileInfo, userProfile, loggedIn } = context;
    const { firstname, lastname, username, userWallet, superUser } = userProfile

    const [stats, setStats] = useState({
        stat1: 'More than a third of the world’s malnourished children live in India',
        stat2: 'More than 2/3rds deaths of under-fives attributed to malnutrition',
        stat3: '95.1M children deprived of midday meals at school during COVID-19'
    })

    const [progress, setProgress] = useState(0)
    const [donationHistoryState, setDonationHistoryState] = useState([])
    const [pendingDonationsState, setPendingDonations] = useState([])
    const [contractBalance, setContractBalance] = useState(0)
    const [proceedButton, setProceedButton] = useState('')

    const deleteCharity = async() => {
        try {
            const url1 = "http://localhost:5000/api/charity/deletecharity/" + id;
            //eslint-disable-next-line
            const response1 = await fetch(url1,
                {
                    method: 'DELETE', 
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            const url2 = "http://localhost:5000/api/charitydonations/deletedonationhistorybycharity"
            //eslint-disable-next-line
            const response2 = await fetch(url2,
                {
                    method: 'DELETE', 
                    headers: {
                        'Content-Type': 'application/json',
                        'charityName': title
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

    useEffect(() => {
        let goalProgress = ((fundsRaised / goal) * 100).toFixed(2)
        setProgress(goalProgress)
    }, [fundsRaised])

    const updateFunds = async(amount) => {
        const url = "http://localhost:5000/api/charity/updatecharity/" + id;
        //console.log(parseFloat(amount), parseFloat(amount) + fundsRaised)
        //eslint-disable-next-line
        const response = await fetch(url,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fundsRaised: fundsRaised + parseFloat(amount)
                })
            }
        );
    }

    const updateDonationLogs = async (amount, status) => {
        const url = "http://localhost:5000/api/charitydonations/adddonations/";
        const now = new Date()
        //eslint-disable-next-line
        const response = await fetch(url,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    'charityName': title,
                    'donorName': firstname + ' ' + lastname,
                    'username': username,
                    'amount': amount,
                    'timestamp': now,
                    'status': status
                })
            }
        );
    }

    const updateDonationStatus = async (status) => {
        const url = "http://localhost:5000/api/charitydonations/updatependingdonationsbycharity"
        const response = await fetch(url,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'charityName': title,
                    'status': 'Pending'
                },
                body: JSON.stringify({
                    'status': status
                })
            }
        )
    }

    const fetchDonationHistory = async () => {
        const url = "http://localhost:5000/api/charitydonations/fetchdonationsbycharity"
        const response = await fetch(url,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'accept':'application/json',
                    'charityName': title
                }
            }
        );
        const data = await response.json()
        // console.log(data)
        setDonationHistoryState(data)
    }

    const handleDonationHistory = () => {
        fetchDonationHistory()
        donationHistoryModalToggle.current.click();
    }

    // Blockchain Code
    const [account, setAccount] = useState("");
    const [contract, setContract] = useState(null);
    let web3;
    async function loadBlockChain() {
        try {
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
            //console.log("Metamask account Address :", accounts[0]);
        
        } catch(err) {
            console.log('Please check if you have started your local blockchain network using Ganache\n', err)
        }
    }

    const saveReceipt = async (receipt) =>{
        try {
            const url = "http://localhost:5000/api/receipt/uploadreceipt" 
            let response = await fetch(url,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                       ...receipt
                    })
                }
             )
             console.log(receipt)
        } catch (error) {
            console.error(error.message)
        }
    }

    const handleDonation = () => {
        if(donAmount >10 || donAmount < 0)
        {
            console.log('amount error!!')
            return;
        }
        makeDonation(title, donAmount)
    }
    
    const makeDonation = (id, amount) => {
        console.log('isVerified: ', isVerified)
        if(isVerified === true) {
            let web3js = new Web3(window.web3.currentProvider); 
            web3js.eth.sendTransaction({
                from: account,
                to: walletAddress,
                value: Web3.utils.toWei(amount, 'Ether')
            })
            .then(function(receipt){
                //console.log(receipt)
                saveReceipt(receipt);
                receiptModalToggle.current.click();
                updateFunds(parseFloat(amount))
                updateDonationLogs(parseFloat(amount), 'Direct')
                // window.location.href = "http://localhost:3000/zone"
            });
        } else {
            contract.methods.updateAmount(id).send({from:account, value: Web3.utils.toWei(amount, 'Ether'), gas: 1000000})
            .once('receipt', (receipt) => {
                //console.log(receipt)
                saveReceipt(receipt);
                receiptModalToggle.current.click();
                updateFunds(parseFloat(amount))
                updateDonationLogs(parseFloat(amount), 'Pending')
               
                // window.location.href = "http://localhost:3000/zone"
            })
        }
    }

    const handleTransfer = () => {
        setProceedButton('Transfer')
        getBalance()
        getPendingDonations()
        pendingDonationsModalToggle.current.click();
        // transferAmount()
    }

    const transferAmount = () => {
        contract.methods.transferAmount(walletAddress, title).send({from: account})
        .once('receipt', (receipt) => {
            console.log(receipt)
            updateDonationStatus('Success')
            pendingDonationsModalToggle.current.click();
        })
    }

    const handleRevert = () => {
        setProceedButton('Revert')
        getBalance()
        getPendingDonations()
        pendingDonationsModalToggle.current.click();
        // revertAmount()
    }

    const revertAmount = () => {
        contract.methods.revertAmount(title).send({from: account})
        .once('receipt', (receipt) => {
            console.log(receipt)
            updateDonationStatus('Reverted')
            pendingDonationsModalToggle.current.click();
        })
    }

    const getBalance = () => {
        const bal = contract.methods.getBalance(title).call()
        bal.then((res) => {
            setContractBalance(Web3.utils.fromWei(res, 'ether'))
        })
    }

    const getPendingDonations = () => {
        // Remove these entries from database before doing Revert
        const pending = contract.methods.getPendingDonations(title).call()
        pending.then((res) => {
            // console.log('Pending donations from blockchain: ', res)
            setPendingDonations(res)
        })
    }

    const revertDonationsInDB = () => {
        pendingDonationsState.map((transaction) => {

        })
    } 


    const openModal = () => {
        console.log('modal open');
        donationModalToggle.current.click();
    }

    const rangeOnChange = (e)=>{
        setdonAmount(e.target.value)
        //console.log(e.target.value)
    }
    const handleInputOnChange = (e) =>{
        setdonAmount(e.target.value)
    }

    const generatePDF = (data)=>{
        let title = "title";
        let tag = "tag";
        if(tag==="")
            tag="No Tag Provided";
        let description = "description";

        let doc = new jsPDF();
        let width = doc.internal.pageSize.getWidth();
        doc.setFont("Lato-Regular","bold");
        doc.setFontSize(30);
        doc.setTextColor("red");
        doc.text('', width/2, 20, { align: 'center' });
        doc.setFont("Lato-Regular","normal");
        doc.setFontSize(20);
        doc.setTextColor("black");
        doc.autoTable({theme: 'grid'});
        doc.autoTable({
            margin: { top: 30,bottom:5},
            body: [
              ['Block Hash', data.blockHash],
              ['Block Number', data.blockNumber],
              ['Contract Address', data.contractAddress || "NULL"],
              ['Cumulative Gas Used', data.cumulativeGasUsed],
              ['from', data.from],
              ['to', data.to],
              ['Gas Price', data.gasPrice],
              ['hash', data.transactionHash],


            ],
          })
//    doc.autoTable({
//  styles: { fillColor: [255, 0, 0] },
//  columnStyles: { 0: { halign: 'center', fillColor: [0, 255, 0] } }, // Cells in first column centered and green
//  margin: { top: 10 },
//  body: [
//    ['Sweden', 'Japan', 'Canada'],
//    ['Norway', 'China', 'USA'],
//    ['Denmark', 'China', 'Mexico'],
//    {
//        theme: 'grid',
//        styles: { lineWidth: 1 },
//    }
//  ],
//})
    
          doc.setFont("Lato-Regular","normal");
        doc.setFontSize(10);
        doc.setTextColor("black");
        doc.text(data.timestamp,width-15,doc.lastAutoTable.finalY+5,{align:'right'});
        let pdfName = title+"_"+data.timestamp+".pdf";
        doc.save(pdfName);
    }

    const generateReceipt = async()=>{
        
        try {
            const url = "http://localhost:5000/api/receipt/getlatestreceipt"
            let response = await fetch(url,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'accept':'application/json',
                        'userWallet':userWallet
                    }
                }
            )
            let data = await response.json()
            
            generatePDF(data);

        } catch (error) {
                console.error(error.message)
            }
           
        history.push('/zone')
    }
    const cancleReceipt = ()=>{
        history.push('/zone')
    }


    useEffect(() => {
        loadBlockChain();
        getProfileInfo();
    }, [])

    
    //Implimentation of account change when metamask public address changes
    //if true then modal open

   const [userAccountChangeModal, setuserAccountChangeModal] = useState('close')
    window.ethereum.on('accountsChanged', function (accountsChange) {
        setAccount(accountsChange[0]);
        //console.log('account changed')
    });

    useEffect(() => {
        try {
            // console.log(userProfile.userWallet.toLowerCase())
            // console.log(account.toLowerCase())
            // console.log(userProfile.userWallet.toLowerCase() === account.toLowerCase())
            // if walletAddress is not equal to current metamask address then prompt user to logout
            if(userProfile.userWallet && account && (account.toLowerCase() !== (userProfile.userWallet.toLowerCase())))
            {   
                //and if the modal is open then close it and open again
                if(userAccountChangeModal === 'close')
                {
                    logOutModalToggle.current.click();
                    setuserAccountChangeModal('open');
                }
            }
            else{
                if(userAccountChangeModal === 'open')
                {
                    logOutModalToggle.current.click()
                    setuserAccountChangeModal('close')
                }
            }
        } catch (error) {
            console.error(error.message)
        }
       
    }, [account])

    const handleAccountChangeOnClick = ()=>{
        logOutUser();
        history.push('/login')
    }

    var date = new Date().toLocaleDateString();
    var time = new Date().toLocaleTimeString();

    
    
    return (
        // section-1 charity info
        <div className="container hero-container">
    
            {/* Donatin button hidden */}
            <button type="button" ref={donationModalToggle} className="btn btn-primary d-none" data-bs-toggle="modal" data-bs-target="#staticBackdrop"></button>

            {/* Donation modal */}
            <div className="modal fade modal-cont" id="staticBackdrop" data-bs-backdrop="static" data-bs-keyboard="false" tabIndex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content" style={{borderRadius:"0px", border:"none"}}>
                        <div className="modal-header paymentModalHeader">
                            <h5 className="modal-title " id="staticBackdropLabel">Payment Details</h5>
                            <button type="button" style={{color:"white"}} className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="row">
                            <div className="col-lg-7 col-xs-12 modal-body">
                                <div className="d-flex flex-row">
                                    <div><h6>From&nbsp;:</h6></div>
                                    <div>{ firstname + ' ' + lastname }</div>
                                </div>
                                <div className="d-flex flex-row">
                                    <div><h6>To&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</h6></div> 
                                    <div>{ title } </div>
                                </div>
                            </div>
                            <div className="col-lg-5 col-xs-12 modal-body">
                                <div className="d-flex flex-row">
                                    <div><h6>Date&nbsp;:</h6></div>
                                    <div>{ date }</div>
                                </div>
                                <div className="d-flex flex-row">
                                    <div><h6>Time&nbsp;:</h6></div> 
                                    <div>{ time } </div>
                                </div>
                            </div>
                            <div className="modal-body">
                                <div className="mt-2"><h6>Value : <input className='inputInvalid' style={{width: "30%"}} type="number"  max="10" min="0" value={donAmount} onChange={handleInputOnChange}  ></input> </h6>  </div>
                                <input type="range" className="form-range" min="0" max={((goal - fundsRaised) < 10)? (goal - fundsRaised) : 10} step="0.0001" id="customRange1" value={donAmount} onChange={rangeOnChange} ></input>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" style={{border:"none",backgroundColor:"transparent", margin:"0px 20px", lineHeight:'1.5'}} data-bs-dismiss="modal">Reject</button>
                            <button type="submit"  onClick={handleDonation} className="btn btn-primary donateBtn" style={{backgroundColor: "#00ffc3", color: "black"}}>Confirm</button>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* RECEIPT MODAL */}
            <button type="button" ref={receiptModalToggle} data-bs-target="#exampleModalToggle2" data-bs-toggle="modal" className="btn btn-primary d-none"></button>
            
            <div className="modal fade receiptModal" id="exampleModalToggle2"  data-bs-backdrop="static" aria-hidden="true" aria-labelledby="exampleModalToggleLabel2" tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content" style={{borderRadius:"0px",border:"none"}} >
                        <div className="modal-header receiptModalTickContainer" style={{borderRadius:"inherit"}}>
                            <i className="far fa-check-circle receiptModalTick"></i>
                            {/*<button type="button" className="btn-close"  data-bs-dismiss="modal" aria-label="Close"></button>*/}
                        </div>
                        <div className="modal-body text-center">
                            <h5 className='fs-3'>Payment Successful</h5>
                        </div>
                        <div className="modal-footer">
                            <button  style={{border:"none",backgroundColor:"transparent", margin:"0px 20px", lineHeight:'1.5'}} data-bs-dismiss="modal" onClick={cancleReceipt} >Cancel</button>
                            <button className="btn btn-primary generateReceipt" data-bs-dismiss="modal" onClick={generateReceipt}>Generate receipt</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Logout Alert */}
            {/*<!-- Button trigger modal -->*/}
            <button type="button" ref={logOutModalToggle} className="btn btn-primary d-none" data-bs-toggle="modal" data-bs-target="#exampleModal">
                Launch demo modal
            </button>

            {/*<!-- Modal -->*/}
            <div className="modal fade" id="exampleModal"  data-bs-backdrop="static" tabIndex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="exampleModalLabel">Please check your Metamask account</h5>
                        </div>
                        <div className="modal-body">
                            Your metamask wallet address does not match the address with your registered public address.<br/>
                            <b>Please change the metamask address or login with correct account.</b><br/><br/>
                            <span>Metamask Account Address:<i> {account} </i></span><br/>
                            <span>Your registered address: <i>{userProfile.userWallet}</i> </span>
                        </div>
                        <div className="modal-footer">
                            <button type="button" data-bs-dismiss="modal" className="btn btn-primary" onClick={handleAccountChangeOnClick} >Logout</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Donation history modal button hidden */}
            <button type="button" ref={donationHistoryModalToggle} className="btn btn-primary d-none" data-bs-toggle="modal" data-bs-target="#donationHistory"></button>

            {/* Donation History Modal */}
            <div className="modal fade donation-history-container" id="donationHistory" data-bs-backdrop="static" data-bs-keyboard="false" tabIndex="-1" aria-labelledby="donationHistoryLabel" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered donation-history-modal-dialog">
                    <div className="modal-content" style={{borderRadius:"0px", border:"none"}}>
                        <div className="modal-header donation-history-modal-header">
                            <h5 className="modal-title donation-history-modal-title" id="donationHistoryLabel">Donation History</h5>
                            <button type="button" style={{color:"white"}} className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body donation-history-modal-body">
                            <div className="donation-history-separator"></div>
                            {
                                donationHistoryState.map((entry) => (
                                    <DonationHistoryItem 
                                        key={entry._id}
                                        name={entry.donorName}
                                        amount={entry.amount}
                                        time={entry.timestamp}
                                        status={entry.status}
                                    />
                                ))
                            }
                        </div>
                        {
                            !isVerified && <div className='modal-footer donation-history-modal-footer'>
                                <div style={{width: "20px", height: "20px", background: "#a8ffd2"}}></div>
                                <div>Success</div>
                                <div style={{width: "20px", height: "20px", background: "#ffffa3"}}></div>
                                <div>Pending</div>
                                <div style={{width: "20px", height: "20px", background: "#ffbdbd"}}></div>
                                <div>Reverted</div>
                            </div>
                        }
                        
                    </div>
                </div>
            </div>

            {/* Pending Donations modal button hidden */}
            <button type="button" ref={pendingDonationsModalToggle} className="btn btn-primary d-none" data-bs-toggle="modal" data-bs-target="#pendingdonations"></button>

            {/* Pending Donations Modal */}
            <div className="modal fade donation-history-container" id="pendingdonations" data-bs-backdrop="static" data-bs-keyboard="false" tabIndex="-1" aria-labelledby="pendingdonationsLabel" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered pending-donations-modal-dialog">
                    <div className="modal-content" style={{borderRadius:"0px", border:"none"}}>
                        <div className="modal-header donation-history-modal-header">
                            <h5 className="modal-title donation-history-modal-title" id="pendingdonationsLabel">Pending Donations</h5>
                            <button type="button" style={{color:"white"}} className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body donation-history-modal-body">
                            <div className="donation-history-separator"></div>
                            {
                                pendingDonationsState.map((entry) => (
                                    <PendingDonationsItem 
                                        // key={entry.donor}
                                        donor={entry.donor}
                                        amount={entry.amount}
                                    />
                                ))
                            }
                        </div>
                        <div className='modal-footer pending-donations-modal-footer'>
                            <div className='float-start'>
                                <strong>Total Amount: {contractBalance} ETH </strong>
                            </div>
                            {
                                proceedButton === 'Transfer' && <button className='btn btn-success float-end me-3' onClick={transferAmount}>Transfer</button>
                            }
                            {
                                proceedButton === 'Revert' && <button className='btn btn-danger float-end me-3' onClick={revertAmount}>Revert</button>
                            }
                        </div>
                    </div>
                </div>
            </div>

            {/* section-1 Description */}
            <div className="row my-5 p-2">
                <div className="col-lg-7 col-md-7">
                    <h2 className="featurette-heading">
                        {title} 
                        {
                            isVerified && <img src={Bluetick} alt='...' style={{"width": "35px"}} className='mx-2'></img>
                        }
                    </h2>
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
                        <p className="lead hero-text">Here are some statistics related to {cause} in India.</p>
                        <div className="row">
                            <div className="col-lg-4 col-md-12">
                                <div className="details-container">
                                    <div className="details-title"><img  className="rounded mx-auto d-block pb-1" src="https://give-marketplace-dev.s3.ap-south-1.amazonaws.com/static/images/home/homev2/Mission+10+Million+Meals/Homepage%2Bicons_A.png" alt="" height="100px" width="100px" /></div>
                                    <p className="details-text">{(stats && stats.stat1) || 'More than a third of the world’s malnourished children live in India'}</p>
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

                        <div>
                            <h5 className='mt-3'>Progress</h5>
                            <p className="card-text mt-1"><small className="text-muted">ETH {fundsRaised.toFixed(4)} raised of ETH {goal} goal</small></p>
                            <div className="progress my-1">
                                <div className="progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100" style={{width:`${progress+'%'}`}}>{progress}%</div>
                            </div>
                        </div>

                        <div className="d-grid gap-2 d-md-flex justify-content-md-start mb-4 mb-lg-3 donate-btns">
                            <button type="button" disabled={((fundsRaised / goal) * 100).toFixed(2) >= 100} onClick={openModal} className="btn btn-primary btn-lg px-4 me-md-2 fw-bold">Donate</button>
                            {(isVerified===false && superUser==true)? <button type="button" onClick={handleTransfer} className="btn btn-success btn-lg px-4 me-md-2 fw-bold">Transfer</button>: null}
                            {(isVerified===false && superUser==true)? <button type="button" onClick={handleRevert} className="btn btn-danger btn-lg px-4 me-md-2 fw-bold">Revert</button>: null}
                        </div>

                        <div className="donation-history mt-4 mx-1" onClick={handleDonationHistory}>
                            See donations history
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
            {(loggedIn && superUser===true)? <div className="d-grid gap-2 d-md-flex justify-content-md-start mb-4 mb-lg-3 charity-details-admin-buttons">
                <Link to={{pathname:"/charityform", state:{button_name:"update", info:props}}} type="button" className="btn btn-success btn-lg px-4 me-md-2 fw-bold">Update</Link>
                <button onClick={deleteCharity} type="button" className="btn btn-danger btn-lg px-4 me-md-2 fw-bold">Delete</button>
            </div> : null}
        </div>
    )
}
