import { Link } from 'react-router-dom';
import { useTheme } from '../../utils/store/themeContext';
import { motion } from 'framer-motion';

export default function NotFoundPage() {
    const { theme } = useTheme();

    return (
        <motion.div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                textAlign: 'center',
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text-primary)'
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <h1 style={{
                fontSize: '120px',
                fontWeight: 'bold',
                marginBottom: '20px',
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
            }}>404</h1>

            <h2 style={{
                fontSize: '32px',
                marginBottom: '16px',
                fontWeight: '600'
            }}>
                Página no encontrada
            </h2>

            <p style={{
                fontSize: '18px',
                marginBottom: '40px',
                maxWidth: '500px'
            }} className="text-secondary">
                Lo sentimos, la página que buscas no existe o ha sido movida.
            </p>

            <Link
                to="/"
                style={{
                    padding: '16px 40px',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    borderRadius: '50px',
                    textDecoration: 'none',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease',
                    boxShadow: `0 0 20px ${theme.colors.primary}40`
                }}
            >
                Volver al inicio
            </Link>
        </motion.div>
    );
}
