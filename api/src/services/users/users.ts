import crypto from 'crypto'

import type { Prisma, UserRole, UserStatus } from '@prisma/client'

import { ForbiddenError, UserInputError } from '@redwoodjs/graphql-server'

import { db } from 'src/lib/db'

// ---------------------------------------------------------------------------
// Password hashing (matches dbAuth PBKDF2 algorithm so users can still login)
// ---------------------------------------------------------------------------

function hashPassword(
  password: string,
  salt?: string
): [hashedPassword: string, salt: string] {
  const useSalt = salt ?? crypto.randomBytes(16).toString('hex')
  const hashed = crypto
    .pbkdf2Sync(password, useSalt, 100_000, 32, 'sha256')
    .toString('hex')
  return [hashed, useSalt]
}

function generateTempPassword(): string {
  return crypto.randomBytes(12).toString('hex')
}

// ---------------------------------------------------------------------------
// Shared filter builder
// ---------------------------------------------------------------------------

function buildWhere(opts: {
  search?: string | null
  role?: UserRole | null
  status?: UserStatus | null
}): Prisma.UserWhereInput {
  const { search, role, status } = opts
  return {
    deletedAt: null,
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }
}

// ---------------------------------------------------------------------------
// Query resolvers
// ---------------------------------------------------------------------------

type UsersArgs = {
  page?: number | null
  pageSize?: number | null
  search?: string | null
  role?: UserRole | null
  status?: UserStatus | null
}

export const users = async ({
  page = 1,
  pageSize = 10,
  search,
  role,
  status,
}: UsersArgs = {}) => {
  const take = pageSize ?? 10
  const skip = ((page ?? 1) - 1) * take
  const where = buildWhere({ search, role, status })

  const [usersData, total] = await Promise.all([
    db.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        createdAt: true,
      },
    }),
    db.user.count({ where }),
  ])

  return { users: usersData, total }
}

export const user = async ({ id }: { id: string }) => {
  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      avatarUrl: true,
      createdAt: true,
    },
  })
}

// ---------------------------------------------------------------------------
// Mutation resolvers
// ---------------------------------------------------------------------------

type CreateUserInput = {
  name?: string | null
  email: string
  role: UserRole
  status: UserStatus
  avatarUrl?: string | null
  password?: string | null
}

export const createUser = async ({ input }: { input: CreateUserInput }) => {
  const rawPassword = input.password ?? generateTempPassword()
  const [hashedPassword, salt] = hashPassword(rawPassword)

  return db.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      status: input.status,
      avatarUrl: input.avatarUrl,
      hashedPassword,
      salt,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      avatarUrl: true,
      createdAt: true,
    },
  })
}

type UpdateUserInput = {
  name?: string | null
  email?: string | null
  role?: UserRole | null
  status?: UserStatus | null
  avatarUrl?: string | null
}

export const updateUser = async ({
  id,
  input,
}: {
  id: string
  input: UpdateUserInput
}) => {
  return db.user.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      avatarUrl: true,
      createdAt: true,
    },
  })
}

export const deleteUser = async ({ id }: { id: string }) => {
  // Prevent self-deletion — enforced at the service layer so it cannot be
  // bypassed even if someone calls the mutation directly.
  if (id === (context.currentUser?.id as string)) {
    throw new ForbiddenError('You cannot delete your own account.')
  }

  // Soft delete — preserves referential integrity with orders
  return db.user.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      avatarUrl: true,
      createdAt: true,
    },
  })
}

// ---------------------------------------------------------------------------
// Current user resolvers (account settings)
// ---------------------------------------------------------------------------

const CURRENT_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  avatarUrl: true,
  createdAt: true,
} as const

export const currentUser = async () => {
  const id = context.currentUser?.id as string
  return db.user.findUnique({ where: { id }, select: CURRENT_USER_SELECT })
}

type UpdateCurrentUserProfileInput = {
  name?: string | null
  email?: string | null
  avatarUrl?: string | null
}

export const updateCurrentUserProfile = async ({
  input,
}: {
  input: UpdateCurrentUserProfileInput
}) => {
  const id = context.currentUser?.id as string

  if (input.email) {
    const existing = await db.user.findFirst({
      where: { email: input.email, NOT: { id } },
    })
    if (existing) {
      throw new UserInputError('Email address is already in use.')
    }
  }

  return db.user.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    },
    select: CURRENT_USER_SELECT,
  })
}

type ChangePasswordInput = {
  currentPassword: string
  newPassword: string
}

export const changePassword = async ({
  input,
}: {
  input: ChangePasswordInput
}) => {
  const id = context.currentUser?.id as string

  const record = await db.user.findUnique({
    where: { id },
    select: { hashedPassword: true, salt: true },
  })
  if (!record) throw new UserInputError('User not found.')

  const [verifyHash] = hashPassword(input.currentPassword, record.salt)
  if (verifyHash !== record.hashedPassword) {
    throw new UserInputError('Current password is incorrect.')
  }

  const [newHashed, newSalt] = hashPassword(input.newPassword)
  await db.user.update({
    where: { id },
    data: { hashedPassword: newHashed, salt: newSalt },
  })

  return true
}
