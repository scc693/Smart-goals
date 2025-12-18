import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Box, Typography, TextField, Button, Alert, Paper } from '@mui/material';

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = data.get('email');
    const password = data.get('password');

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch {
      setError('Failed to log in');
    }
    setLoading(false);
  }

  async function handleGoogleLogin() {
    try {
        setError('');
        setLoading(true);
        await loginWithGoogle();
        navigate('/');
    } catch (e) {
        console.error(e);
        setError('Failed to log in with Google');
    }
    setLoading(false);
  }

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography component="h1" variant="h5">
            Log In
            </Typography>
            {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                autoFocus
            />
            <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
            />
            <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
            >
                Log In
            </Button>
            <Button
                fullWidth
                variant="outlined"
                sx={{ mb: 2 }}
                onClick={handleGoogleLogin}
                disabled={loading}
            >
                Log In With Google
            </Button>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Link to="/signup" style={{ textDecoration: 'none' }}>
                    <Typography variant="body2" color="primary">
                        Don't have an account? Sign Up
                    </Typography>
                </Link>
            </Box>
            </Box>
        </Paper>
      </Box>
    </Container>
  );
}
