import { navigate, routes } from '@redwoodjs/router'
import { useMutation } from '@redwoodjs/web'
import { Metadata } from '@redwoodjs/web'

import UserForm from 'src/components/Users/UserForm'
import type { UserFormValues } from 'src/components/Users/userSchema'
import { useToast } from 'src/hooks/use-toast'

// ---------------------------------------------------------------------------
// GraphQL Mutation
// ---------------------------------------------------------------------------

const CREATE_USER_MUTATION = gql`
  mutation CreateUserMutation($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
    }
  }
`

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const NewUserPage = () => {
  const { toast } = useToast()

  const [createUser, { loading }] = useMutation(CREATE_USER_MUTATION, {
    onCompleted: ({ createUser: created }) => {
      toast({
        title: 'User created',
        description: `"${created.name ?? created.email}" has been added.`,
      })
      navigate(routes.adminUsers())
    },
    onError: (error) => {
      toast({
        title: 'Failed to create user',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const handleSubmit = async (data: UserFormValues) => {
    await createUser({
      variables: {
        input: {
          name: data.name,
          email: data.email,
          role: data.role,
          status: data.status,
          avatarUrl: data.avatarUrl || null,
          password: data.password || null,
        },
      },
    })
  }

  return (
    <>
      <Metadata
        title="Add User"
        description="Add a new user to your dashboard"
        robots="nofollow"
      />
      <UserForm
        mode="create"
        title="Add User"
        subtitle="Create a new admin, staff, or customer account"
        onSubmit={handleSubmit}
        loading={loading}
      />
    </>
  )
}

export default NewUserPage
