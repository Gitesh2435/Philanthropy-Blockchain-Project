import React, { useState } from 'react'
import DonateCard from '../components/DonateCard';
import Map from '../components/Map'
import './Home.css'
import './Charityzone.css'

const CharityZone = () => {
    const [state, setstate] = useState('India');
    const cardinfo = {
        title:"Emergency Response: Keep 1000 Vulnerable Children Safe and in Education",
        description:"Help keep 1000 at-risk children safe and in learning during the biggest global education emergency since World War II.",

    }
    const [cardInfo, setcardInfo] = useState(cardinfo)

    const handleOnClick = (e)=>{
        if(e.target.getAttribute("title"))
        {
            console.log(e.target.getAttribute("title"));
            setstate(e.target.getAttribute("title"))
        }
      }
      
    
    return (
        <>   
            <div className="mapContainer">
                <Map handleOnClick={handleOnClick}  />    
            </div>
                <div className="filler_map"></div>
            {/* SVG background */}
            <div className="svg_background_2">
            <div className="tilt_svg_2">
                <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                    <path d="M1200 120L0 16.48 0 0 1200 0 1200 120z" className="shape-fill"></path>
                </svg>
            </div>
            </div>
            <section className="card-conatiner-warpper">
                <div className=" row row-cols-1 row-cols-md-3 g-4 mx-0 card-container">
                  <DonateCard cardInfo={cardInfo} />
                </div>
            </section>
        </>
    )
}

export default CharityZone
