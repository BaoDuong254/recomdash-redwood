import { useMutation, useQuery } from '@redwoodjs/web'
import { Metadata } from '@redwoodjs/web'

import PasswordForm from 'src/components/settings/PasswordForm'
import ProfileForm from 'src/components/settings/ProfileForm'
import type { ProfileData } from 'src/components/settings/ProfileForm'
import SettingsHeader from 'src/components/settings/SettingsHeader'
import type { ProfileFormValues } from 'src/components/settings/settingsSchemas'
import type { PasswordFormValues } from 'src/components/settings/settingsSchemas'
import { Skeleton } from 'src/components/ui/skeleton'
import { useToast } from 'src/hooks/use-toast'

// ---------------------------------------------------------------------------
// GraphQL
// ---------------------------------------------------------------------------

const CURRENT_USER_QUERY = gql`
  query SettingsCurrentUserQuery {
    currentUser {
      id
      name
      email
      role
      status
      avatarUrl
    }
  }
`

const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateCurrentUserProfileMutation(
    $input: UpdateCurrentUserProfileInput!
  ) {
    updateCurrentUserProfile(input: $input) {
      id
      name
      email
      avatarUrl
    }
  }
`

const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePasswordMutation($input: ChangePasswordInput!) {
    changePassword(input: $input)
  }
`

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

const SettingsSkeleton = () => (
  <div className="tw-space-y-4">
    <Skeleton className="tw-h-10 tw-w-48" />
    <Skeleton className="tw-h-64 tw-w-full tw-rounded-lg" />
    <Skeleton className="tw-h-64 tw-w-full tw-rounded-lg" />
  </div>
)

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const SettingsPage = () => {
  const { toast } = useToast()

  const { data, loading: queryLoading } = useQuery(CURRENT_USER_QUERY)

  const [updateProfile, { loading: profileLoading }] = useMutation(
    UPDATE_PROFILE_MUTATION,
    {
      refetchQueries: [{ query: CURRENT_USER_QUERY }],
      onCompleted: () => {
        toast({
          title: 'Profile updated',
          description: 'Your profile information has been saved.',
        })
      },
      onError: (error) => {
        toast({
          title: 'Failed to update profile',
          description: error.message,
          variant: 'destructive',
        })
      },
    }
  )

  const [changePassword, { loading: passwordLoading }] = useMutation(
    CHANGE_PASSWORD_MUTATION,
    {
      onCompleted: () => {
        toast({
          title: 'Password changed',
          description: 'Your password has been updated successfully.',
        })
      },
      onError: (error) => {
        toast({
          title: 'Failed to change password',
          description: error.message,
          variant: 'destructive',
        })
      },
    }
  )

  const handleProfileSubmit = async (data: ProfileFormValues) => {
    await updateProfile({
      variables: {
        input: {
          name: data.name,
          email: data.email,
          avatarUrl: data.avatarUrl || null,
        },
      },
    })
  }

  const handlePasswordSubmit = async (data: PasswordFormValues) => {
    await changePassword({
      variables: {
        input: {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        },
      },
    })
  }

  const currentUser = data?.currentUser as ProfileData | null

  return (
    <>
      <Metadata
        title="Account Settings"
        description="Manage your profile and security settings"
        robots="nofollow"
      />

      <div className="tw-mx-auto tw-max-w-2xl">
        {queryLoading ? (
          <SettingsSkeleton />
        ) : (
          <div className="tw-space-y-6">
            <SettingsHeader
              title="Account Settings"
              subtitle="Manage your profile information and password."
            />

            <ProfileForm
              currentUser={currentUser}
              onSubmit={handleProfileSubmit}
              loading={profileLoading}
            />

            <PasswordForm
              onSubmit={handlePasswordSubmit}
              loading={passwordLoading}
            />
          </div>
        )}
      </div>
    </>
  )
}

export default SettingsPage
