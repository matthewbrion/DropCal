import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Protocols from './pages/Protocols';
import Medications from './pages/Medications';
import Physician from './pages/Physician';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

function AppRoutes() {
  const { loading } = useAuth();
  if (loading) {
    return <div className='min-h-screen bg-surface flex items-center justify-center'>
      <p className='text-body-lg text-ink-muted'>Loading...</p>
    </div>
  }
  return (
    <Routes>
      <Route path='/register' element={<Register />} />
      <Route path='/login' element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path='/' element={<Home />} />
          <Route path='/profile' element={<Profile />} />
          <Route path='/protocols' element={<Protocols />} />
          <Route path='/medications' element={<Medications />} />
          <Route path='/physician' element={<Physician />} />
        </Route>
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;