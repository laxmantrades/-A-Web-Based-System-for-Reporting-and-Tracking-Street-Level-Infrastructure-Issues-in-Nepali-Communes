import { useCallback, useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { getOfficerSession } from '../../lib/officerApi'

// Protects officer pages.
//   not logged in      -> login page
//   mustChangePassword -> change password page
//   no job title       -> profile page
//   else -> show page, with { officer, refresh, setOfficer } in useOutletContext()
export default function OfficerRoute() {
  const location = useLocation()
  const [state, setState] = useState({ status: 'checking' })

  const load = useCallback(
    () =>
      getOfficerSession().then((officer) =>
        setState({ status: officer ? 'authed' : 'anon', officer }),
      ),
    [],
  )

  useEffect(() => {
    let alive = true
    getOfficerSession().then((officer) => {
      if (alive) setState({ status: officer ? 'authed' : 'anon', officer })
    })
    return () => {
      alive = false
    }
  }, [])

  const refresh = useCallback(() => {
    setState({ status: 'checking' })
    return load()
  }, [load])

  if (state.status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <Loader2 className="animate-spin text-slate-400" aria-hidden="true" />
      </div>
    )
  }

  if (state.status === 'anon') {
    return <Navigate to="/officer/login" replace />
  }

  if (
    state.officer.mustChangePassword &&
    location.pathname !== '/officer/change-password'
  ) {
    return <Navigate to="/officer/change-password" replace />
  }

  if (
    !state.officer.mustChangePassword &&
    !state.officer.jobTitle &&
    location.pathname !== '/officer/profile'
  ) {
    return <Navigate to="/officer/profile" replace />
  }

  const setOfficer = (officer) => setState({ status: 'authed', officer })

  return <Outlet context={{ officer: state.officer, refresh, setOfficer }} />
}
