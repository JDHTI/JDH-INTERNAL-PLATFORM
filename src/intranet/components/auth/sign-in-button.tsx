"use client"

import * as React from "react"

import { JdhButton } from "@/intranet/components/common/jdh-button"
import { MicrosoftLogo } from "@/intranet/components/icons/microsoft-logo"
import { LOGIN_URL } from "@/shared/lib/api-client"

/** Starts the API's Entra SSO; the API sends the person back to the platform. */
export function SignInButton() {
  const [loading, setLoading] = React.useState(false)

  return (
    <JdhButton
      size="lg"
      loading={loading}
      className="w-full"
      onClick={() => {
        setLoading(true)
        window.location.assign(LOGIN_URL)
      }}
    >
      <MicrosoftLogo />
      Entrar con Microsoft
    </JdhButton>
  )
}
