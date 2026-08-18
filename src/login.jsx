import React from 'react';

const Login = () => {
    const probarConexion = async () => {
        try {
            // Hacemos un fetch a la ruta que configuramos en el backend
            const response = await fetch('http://localhost:3000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'test@test.com', password: '123' })
            });
            
            // Si llega acá, es que el backend respondió (aunque sea un error 401)
            alert("¡Conexión exitosa! El backend está respondiendo.");
        } catch (error) {
            alert("Error: No se pudo conectar al backend. Revisa si está encendido.");
        }
    };

    return (
        <div style={{ padding: '50px' }}>
            <h1>Test de Conexión</h1>
            <button onClick={probarConexion}>Probar conexión con Backend</button>
        </div>
    );
};

export default Login;