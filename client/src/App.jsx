import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Protocols from './pages/Protocols';
import Medications from './pages/Medications';
import Physician from './pages/Physician';
import PatientProfile from './pages/PatientProfile';
import AssignPatient from './pages/AssignPatient';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import LoadingScreen from './components/LoadingScreen';

function AppRoutes() {
  const { loading, user } = useAuth();
  const isDoctor = user?.role === 'doctor';
  if (loading) {
    return <LoadingScreen message='Loading...' />
  }
  return (
    <Routes>
      <Route path='/register' element={<Register />} />
      <Route path='/login' element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path='/' element={isDoctor ? <Navigate to='/physician' replace /> : <Home />} />
          <Route path='/profile' element={<Profile />} />
          <Route path='/protocols' element={<Protocols />} />
          <Route path='/medications' element={<Medications />} />
          <Route path='/physician' element={isDoctor ? <Physician /> : <Navigate to='/' replace />} />
          <Route path='/physician/assign' element={isDoctor ? <AssignPatient /> : <Navigate to='/' replace />} />
          <Route path='/physician/:patientId' element={<PatientProfile />} />
        </Route>
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;