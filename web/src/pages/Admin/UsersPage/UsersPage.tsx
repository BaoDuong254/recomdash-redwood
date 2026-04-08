import { useEffect, useState } from 'react'

import { navigate, routes } from '@redwoodjs/router'
import { useMutation, useQuery } from '@redwoodjs/web'
import { Metadata } from '@redwoodjs/web'

import Pagination from 'src/components/Products/Pagination'
import type { PaginationState } from 'src/components/Products/types'
import DeleteUserDialog from 'src/components/Users/DeleteUserDialog'
import type { User, UserFiltersState } from 'src/components/Users/types'
import UserFilters from 'src/components/Users/UserFilters'
import UserHeader from 'src/components/Users/UserHeader'
import UserTable from 'src/components/Users/UserTable'
import { useToast } from 'src/hooks/use-toast'

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const USERS_QUERY = gql`
  query UsersPageQuery(
    $page: Int
    $pageSize: Int
    $search: String
    $role: UserRole
    $status: UserStatus
  ) {
    users(
      page: $page
      pageSize: $pageSize
      search: $search
      role: $role
      status: $status
    ) {
      users {
        id
        name
        email
        role
        status
        avatarUrl
        createdAt
      }
      total
    }
  }
`

const DELETE_USER_MUTATION = gql`
  mutation DeleteUserFromListMutation($id: String!) {
    deleteUser(id: $id) {
      id
      name
    }
  }
`

// ---------------------------------------------------------------------------
// Debounce hook
// ---------------------------------------------------------------------------

function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const UsersPage = () => {
  const { toast } = useToast()

  const [filters, setFilters] = useState<UserFiltersState>({
    search: '',
    role: 'all',
    status: 'all',
  })
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    total: 0,
  })
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  const debouncedSearch = useDebounce(filters.search, 400)

  const queryVariables = {
    page: pagination.page,
    pageSize: pagination.pageSize,
    search: debouncedSearch || null,
    role: filters.role !== 'all' ? filters.role : null,
    status: filters.status !== 'all' ? filters.status : null,
  }

  const { data, loading } = useQuery(USERS_QUERY, {
    variables: queryVariables,
    onError: (error) => {
      toast({
        title: 'Failed to load users',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const [deleteUser, { loading: deleteLoading }] = useMutation(
    DELETE_USER_MUTATION,
    {
      onCompleted: ({ deleteUser: deleted }) => {
        toast({
          title: 'User deleted',
          description: `"${deleted.name ?? deleted.id}" has been removed.`,
        })
        setDeleteTarget(null)
      },
      onError: (error) => {
        toast({
          title: 'Failed to delete user',
          description: error.message,
          variant: 'destructive',
        })
      },
      refetchQueries: [{ query: USERS_QUERY, variables: queryVariables }],
    }
  )

  // Sync total from query result into pagination state
  const total = data?.users?.total ?? pagination.total
  useEffect(() => {
    if (
      data?.users?.total !== undefined &&
      data.users.total !== pagination.total
    ) {
      setPagination((prev) => ({ ...prev, total: data.users.total }))
    }
  }, [data?.users?.total]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (key: keyof UserFiltersState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    await deleteUser({ variables: { id: deleteTarget.id } })
  }

  const users: User[] = data?.users?.users ?? []

  return (
    <>
      <Metadata
        title="User Management"
        description="Manage admin accounts, staff, and customers"
        robots="nofollow"
      />

      <div className="tw-space-y-6">
        <UserHeader onAddUser={() => navigate(routes.adminNewUser())} />

        <UserFilters filters={filters} onFilterChange={handleFilterChange} />

        <UserTable
          users={users}
          loading={loading}
          onEdit={(user) => navigate(routes.adminEditUser({ id: user.id }))}
          onDelete={(user) => setDeleteTarget(user)}
        />

        <Pagination
          pagination={{ ...pagination, total }}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
          onPageSizeChange={(pageSize) =>
            setPagination({ page: 1, pageSize, total })
          }
        />
      </div>

      <DeleteUserDialog
        open={deleteTarget !== null}
        userName={deleteTarget?.name}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />
    </>
  )
}

export default UsersPage
