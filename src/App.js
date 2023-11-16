import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Menus from './pages/Menus';
import Settings from './pages/Settings';
import Avatars from './pages/Avatars';
import NavMenu from './components/NavMenu/NavMenu';

function App() {
  return (
    <BrowserRouter>

      <header>
        <NavMenu logoName='Twist Cafe'/>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="menus" element={<Menus />} />
          <Route path="avatars" element={<Avatars />} />
          <Route path="settings" element={<Settings />} />
        </Routes>
      </main>

    </BrowserRouter>

  )
}

export default App;
