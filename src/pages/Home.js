import React from 'react'
import './Home.css'
import InfoWidget from '../components/InfoWidget'

const Home = () => {
    return (
        <div>
            {/* Remove below comment to check Infowidget */}
            {/* <InfoWidget /> */}

            {/* BACKGROUND SVG */}
            <div className="svg-tilt">
            <div className="tilt">
                <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                    <path d="M1200 120L0 16.48 0 0 1200 0 1200 120z" className="shape-fill"></path>
                </svg>
            </div>
            </div>
            <img src="https://saltlending.com/wp-content/uploads/2020/10/Frame.svg" className="attachment-full size-full" alt="" loading="lazy" width="242" height="826"></img>
            
            {/*title // Gitesh*/}            

            {/*How to charity // Saurabh*/}

            {/*security and controls // Gitesh*/}

            {/*our patners // Saurabh*/}

            {/*team info // Gitesh*/}
            
            {/*footer // Saurabh*/}
        </div>
    )
}

export default Home
