import YakAvatar from "../components/YakAvatar/YakAvatar";
import ModeSelect from "../components/ModeSelect/ModeSelect"

const Home = () => {
    return (
        <div className="home">
            <div className="avatar-panel" >
                <YakAvatar />
            </div>
            <div className='home-mode-buttons'>
                < ModeSelect />
            </div>
        </div>
    )
}

export default Home;
