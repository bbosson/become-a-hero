import { Router } from 'express'
import { prisma } from '../../lib/db'

const router = Router()

router.get('/', async (_req, res) => {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  })
  res.json(settings)
})

router.put('/', async (req, res) => {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    create: { id: 1, ...req.body },
    update: req.body,
  })
  res.json(settings)
})

export default router
