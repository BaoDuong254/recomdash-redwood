type SettingsHeaderProps = {
  title: string
  subtitle?: string
}

const SettingsHeader = ({ title, subtitle }: SettingsHeaderProps) => {
  return (
    <div className="tw-mb-6">
      <h1 className="tw-text-2xl tw-font-bold tw-tracking-tight tw-text-foreground">
        {title}
      </h1>
      {subtitle && (
        <p className="tw-mt-1 tw-text-sm tw-text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  )
}

export default SettingsHeader
