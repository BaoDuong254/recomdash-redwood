import {
  createUser,
  deleteUser,
  user,
  updateUser,
  users,
} from 'src/services/users/users'

import { Params } from '../validators/intentValidator'

import type { ChatResult } from './types'

function ok(reply: string, data?: unknown): ChatResult {
  return { reply, data: data ? JSON.stringify(data) : null, success: true }
}

function err(reply: string): ChatResult {
  return { reply, data: null, success: false }
}

export async function listUsers(
  raw: Record<string, unknown>
): Promise<ChatResult> {
  const p = Params.LIST_USERS.safeParse(raw)
  if (!p.success) return err('Invalid parameters for listing users.')

  const result = await users(p.data)
  const { users: items, total } = result

  if (items.length === 0) return ok('No users found matching your criteria.')

  const summary = items
    .map((u) => `• ${u.name ?? u.email} (${u.role}) — ${u.status}`)
    .join('\n')

  return ok(
    `Found **${total}** user(s) (showing ${items.length}):\n\n${summary}`,
    result
  )
}

export async function getUser(
  raw: Record<string, unknown>
): Promise<ChatResult> {
  const p = Params.GET_USER.safeParse(raw)
  if (!p.success) return err('Please provide a user ID or email.')

  if (p.data.id) {
    const item = await user({ id: p.data.id })
    if (!item) return err(`No user found with ID \`${p.data.id}\`.`)
    return ok(
      `**${item.name ?? item.email}**\nEmail: ${item.email} | Role: ${item.role} | Status: ${item.status}`,
      item
    )
  }

  if (p.data.email) {
    const result = await users({ search: p.data.email, pageSize: 1 })
    if (result.users.length === 0)
      return err(`No user found with email "${p.data.email}".`)
    const item = result.users[0]
    return ok(
      `**${item.name ?? item.email}**\nEmail: ${item.email} | Role: ${item.role} | Status: ${item.status}`,
      item
    )
  }

  return err('Please provide a user ID or email.')
}

export async function createNewUser(
  raw: Record<string, unknown>
): Promise<ChatResult> {
  const p = Params.CREATE_USER.safeParse(raw)
  if (!p.success) {
    const fields = p.error.issues.map((e) => e.path.join('.')).join(', ')
    return err(
      `Missing or invalid fields: ${fields}. Required: name, email, role.`
    )
  }

  const item = await createUser({
    input: {
      name: p.data.name,
      email: p.data.email,
      role: p.data.role,
      status: p.data.status,
    },
  })

  return ok(
    `User **${item.name ?? item.email}** created successfully.\nEmail: ${item.email} | Role: ${item.role} | Status: ${item.status}\n\nA temporary password has been generated for this account.`,
    item
  )
}

export async function updateExistingUser(
  raw: Record<string, unknown>
): Promise<ChatResult> {
  const p = Params.UPDATE_USER.safeParse(raw)
  if (!p.success)
    return err('Invalid update parameters. An `id` field is required.')

  const { id, ...fields } = p.data
  if (Object.keys(fields).length === 0)
    return err('No fields to update were specified.')

  const item = await updateUser({ id, input: fields })
  return ok(`User **${item.name ?? item.email}** updated successfully.`, item)
}

export async function deleteExistingUser(
  raw: Record<string, unknown>
): Promise<ChatResult> {
  const p = Params.DELETE_USER.safeParse(raw)
  if (!p.success) return err('Please provide the user ID or email to delete.')

  let targetId = p.data.id

  if (!targetId && p.data.email) {
    const result = await users({ search: p.data.email, pageSize: 1 })
    if (result.users.length === 0)
      return err(`No user found with email "${p.data.email}".`)
    targetId = result.users[0].id
  }

  if (!targetId) return err('Please provide the user ID to delete.')

  const item = await deleteUser({ id: targetId })
  return ok(`User **${item.name ?? item.email}** has been deactivated.`)
}
