import express from 'express'
import path from 'path'
import booksRouter from './routes/books'
import uploadRouter from './routes/upload'
import settingsRouter from './routes/settings'
import nodesRouter from './routes/nodes'
import savegameRouter from './routes/savegame'
import processRouter from './routes/process'

const app = express()
const PORT = parseInt(process.env.API_PORT || '3001', 10)

app.use(express.json())

app.use('/api/books', booksRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/nodes', nodesRouter)
app.use('/api/savegame', savegameRouter)
app.use('/api/process', processRouter)

// Serve uploaded files (images, audio, PDFs)
app.use('/api/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on port ${PORT}`)
})
