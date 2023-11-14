import { Container } from '@mui/material'
import Smiley from '../../assets/smiles.png'
import './YakAvatar.css'

const YakAvatar = () => {
    return (
        <Container className='yak-avatar'>
            <img src={ Smiley } alt='Smiley' />
        </Container>
    )
}
export default YakAvatar