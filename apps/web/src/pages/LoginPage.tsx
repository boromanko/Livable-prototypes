import { FormEvent, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { validateDemoAccessPassword } from '../api/http';
import { setDemoAccessPassword } from '../lib/demoAccess';

export function LoginPage(): JSX.Element {
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmitDisabled = useMemo(
    () => isSubmitting || password.trim().length === 0,
    [isSubmitting, password]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const normalizedPassword = password.trim();
      await validateDemoAccessPassword(normalizedPassword);
      setDemoAccessPassword(normalizedPassword);
      setPassword('');
    } catch {
      setErrorMessage('Incorrect password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        background:
          'radial-gradient(circle at top right, rgba(8, 114, 130, 0.1), transparent 42%), #f4f7f9'
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 420,
          p: 4,
          border: '1px solid #D7E0E7'
        }}
      >
        <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
          <Stack spacing={1}>
            <Typography variant="h5" fontWeight={700}>
              Demo Access
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter the password to open the demo.
            </Typography>
          </Stack>

          <TextField
            autoFocus
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            fullWidth
          />

          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

          <Button type="submit" variant="contained" disabled={isSubmitDisabled}>
            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Sign in'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
