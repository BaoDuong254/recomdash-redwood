import { navigate, routes } from '@redwoodjs/router'
import { useMutation, useQuery } from '@redwoodjs/web'
import { Metadata } from '@redwoodjs/web'

import type { User } from 'src/components/Users/types'
import UserForm from 'src/components/Users/UserForm'
import type { UserFormValues } from 'src/components/Users/userSchema'
import { useToast } from 'src/hooks/use-toast'

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const USER_QUERY = gql`
  query EditUserQuery($id: String!) {
    user(id: $id) {
      id
      name
      email
      role
      status
      avatarUrl
      createdAt
    }
  }
`

const UPDATE_USER_MUTATION = gql`
  mutation UpdateUserMutation($id: String!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      name
      email
    }
  }
`

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type EditUserPageProps = {
  id: string
}

const EditUserPage = ({ id }: EditUserPageProps) => {
  const { toast } = useToast()

  const { data, loading: queryLoading } = useQuery(USER_QUERY, {
    variables: { id },
    onError: (error) => {
      toast({
        title: 'Failed to load user',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const [updateUser, { loading: mutationLoading }] = useMutation(
    UPDATE_USER_MUTATION,
    {
      onCompleted: ({ updateUser: updated }) => {
        toast({
          title: 'User updated',
          description: `"${updated.name ?? updated.email}" has been saved.`,
        })
        navigate(routes.adminUsers())
      },
      onError: (error) => {
        toast({
          title: 'Failed to update user',
          description: error.message,
          variant: 'destructive',
        })
      },
    }
  )

  const handleSubmit = async (formData: UserFormValues) => {
    await updateUser({
      variables: {
        id,
        input: {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status,
          avatarUrl: formData.avatarUrl || null,
        },
      },
    })
  }

  const user = data?.user as User | null

  return (
    <>
      <Metadata
        title={user ? `Edit — ${user.name ?? user.email}` : 'Edit User'}
        description="Edit user details"
        robots="nofollow"
      />
      <UserForm
        mode="edit"
        title="Edit User"
        subtitle={user?.email}
        defaultValues={user}
        onSubmit={handleSubmit}
        loading={queryLoading || mutationLoading}
      />
    </>
  )
}

export default EditUserPage
