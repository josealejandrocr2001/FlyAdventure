import React, { useState } from 'react';
import { auth } from '../config/firebase'; // Tu config de firebase
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    // Función para entrar
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/dashboard'); // Te manda al panel cuando entras
        } catch (err) {
            setError('Usuario o contraseña incorrectos.');
        }
    };

    // Función para recuperar contraseña
    const handleResetPassword = async () => {
        if (!email) {
            setError('Por favor, ingresa tu correo primero.');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            setMessage('Se ha enviado un correo para restablecer tu contraseña.');
            setError('');
        } catch (err) {
            setError('Error al enviar el correo. Verifica el email.');
        }
    };

    return (
        <main className="login-page">
            <div className="login-container">
                <h2>Panel <span>Admin</span></h2>
                <p>Ingresa tus credenciales para gestionar Fly Adventure</p>

                <form onSubmit={handleLogin}>
                    <div className="input-group">
                        <label>Correo Electrónico</label>
                        <input 
                            type="email" 
                            placeholder="admin@flyadventure.com" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required 
                        />
                    </div>

                    <div className="input-group">
                        <label>Contraseña</label>
                        <input 
                            type="password" 
                            placeholder="••••••••" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                        />
                    </div>

                    {error && <p className="error-alert">{error}</p>}
                    {message && <p className="success-alert">{message}</p>}

                    <button type="submit" className="btn-reserve" style={{ width: '100%', marginTop: '10px' }}>
                        Ingresar
                    </button>
                </form>

                <button onClick={handleResetPassword} className="btn-forgot">
                    ¿Olvidó su contraseña?
                </button>
            </div>
        </main>
    );
};

export default Login;