import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import svgr from 'vite-plugin-svgr';



export default defineConfig({
	plugins: [tsconfigPaths(), react(), svgr()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@components': path.resolve(__dirname, './src/ui/components'),
			'@pages': path.resolve(__dirname, './src/ui/pages'),
			'@hooks': path.resolve(__dirname, './src/hooks'),
			'@utils': path.resolve(__dirname, './src/utils'),
		},
	},	
})
