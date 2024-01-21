import { Container } from '@mui/material'
import Listening from '../../assets/smiles.png'
import Not_Listening from '../../assets/smiles_with_headphones.png'

import './YakAvatar.css'

const YakAvatar = ({icon}) => {
    return (
        <Container className='yak-avatar'>
            <img src={ icon === process.env.REACT_APP_NOT_LISTENING_ICON ? Not_Listening : Listening } alt='smiley_status_icon' />
        </Container>
    )
}
export default YakAvatar