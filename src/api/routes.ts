import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'

export const apiRouter = new OpenAPIHono()

// Schemas
const ErrorSchema = z.object({
  code: z.string().openapi({ example: 'NOT_FOUND' }),
  message: z.string().openapi({ example: 'Resource not found' }),
}).openapi('ErrorResponse')

const HealthSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']).openapi({ example: 'ok' }),
  version: z.string().openapi({ example: '1.0.0' }),
  timestamp: z.string().openapi({ example: '2026-08-19T16:00:00.000Z' }),
  runtime: z.string().openapi({ example: 'Cloudflare Workers (workerd)' }),
}).openapi('HealthResponse')

const UserSchema = z.object({
  id: z.string().openapi({ example: 'usr_101' }),
  name: z.string().openapi({ example: 'Sarah Connor' }),
  email: z.string().email().openapi({ example: 'sarah@example.com' }),
  role: z.enum(['admin', 'member', 'viewer']).openapi({ example: 'admin' }),
  createdAt: z.string().openapi({ example: '2026-01-15T08:30:00.000Z' }),
}).openapi('User')

type User = z.infer<typeof UserSchema>

const CreateUserSchema = z.object({
  name: z.string().min(2).openapi({ example: 'John Doe' }),
  email: z.string().email().openapi({ example: 'john@example.com' }),
  role: z.enum(['admin', 'member', 'viewer']).default('member').openapi({ example: 'member' }),
}).openapi('CreateUserPayload')

const ProjectSchema = z.object({
  id: z.string().openapi({ example: 'prj_404' }),
  name: z.string().openapi({ example: 'Edge Documentation Platform' }),
  status: z.enum(['active', 'archived', 'draft']).openapi({ example: 'active' }),
  stars: z.number().openapi({ example: 1240 }),
}).openapi('Project')

// Mock Database
const usersDb: User[] = [
  {
    id: 'usr_1',
    name: 'Sarah Connor',
    email: 'sarah@example.com',
    role: 'admin',
    createdAt: '2026-01-15T08:30:00.000Z'
  },
  {
    id: 'usr_2',
    name: 'John Connor',
    email: 'john@example.com',
    role: 'member',
    createdAt: '2026-02-10T12:00:00.000Z'
  }
]

// 1. Health Route
const getHealthRoute = createRoute({
  method: 'get',
  path: '/api/v1/health',
  tags: ['System'],
  summary: 'Check API Health',
  description: 'Returns health status and runtime environment details for the Cloudflare Worker.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: HealthSchema
        }
      },
      description: 'System is operational'
    }
  }
})

apiRouter.openapi(getHealthRoute, (c) => {
  return c.json({
    status: 'ok' as const,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    runtime: 'Cloudflare Workers (workerd)'
  }, 200)
})

// 2. List Users Route
const getUsersRoute = createRoute({
  method: 'get',
  path: '/api/v1/users',
  tags: ['Users'],
  summary: 'List Users',
  description: 'Retrieve a list of all users registered in the system.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(UserSchema)
        }
      },
      description: 'List of users'
    }
  }
})

apiRouter.openapi(getUsersRoute, (c) => {
  return c.json(usersDb, 200)
})

// 3. Create User Route
const createUserRoute = createRoute({
  method: 'post',
  path: '/api/v1/users',
  tags: ['Users'],
  summary: 'Create User',
  description: 'Creates a new user profile with validation.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateUserSchema
        }
      },
      required: true
    }
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: UserSchema
        }
      },
      description: 'User created successfully'
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      },
      description: 'Invalid input payload'
    }
  }
})

apiRouter.openapi(createUserRoute, (c) => {
  const body = c.req.valid('json')
  const newUser: User = {
    id: `usr_${Date.now()}`,
    name: body.name,
    email: body.email,
    role: body.role,
    createdAt: new Date().toISOString()
  }
  usersDb.push(newUser)
  return c.json(newUser, 201)
})

// 4. Get User by ID Route
const getUserByIdRoute = createRoute({
  method: 'get',
  path: '/api/v1/users/{id}',
  tags: ['Users'],
  summary: 'Get User by ID',
  description: 'Retrieve detailed information for a single user by their ID.',
  request: {
    params: z.object({
      id: z.string().openapi({
        param: {
          name: 'id',
          in: 'path'
        },
        example: 'usr_1'
      })
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: UserSchema
        }
      },
      description: 'User details'
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      },
      description: 'User not found'
    }
  }
})

apiRouter.openapi(getUserByIdRoute, (c) => {
  const { id } = c.req.valid('param')
  const user = usersDb.find(u => u.id === id)
  if (!user) {
    return c.json({ code: 'NOT_FOUND', message: `User with ID '${id}' not found.` }, 404)
  }
  return c.json(user, 200)
})

// 5. List Projects Route
const getProjectsRoute = createRoute({
  method: 'get',
  path: '/api/v1/projects',
  tags: ['Projects'],
  summary: 'List Projects',
  description: 'Returns available projects with metadata.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(ProjectSchema)
        }
      },
      description: 'List of projects'
    }
  }
})

apiRouter.openapi(getProjectsRoute, (c) => {
  return c.json([
    {
      id: 'prj_1',
      name: 'Hono Edge Framework',
      status: 'active' as const,
      stars: 21500
    },
    {
      id: 'prj_2',
      name: 'Scalar API Reference',
      status: 'active' as const,
      stars: 9800
    },
    {
      id: 'prj_3',
      name: 'Cloudflare Workers Runtime',
      status: 'active' as const,
      stars: 18000
    }
  ], 200)
})
