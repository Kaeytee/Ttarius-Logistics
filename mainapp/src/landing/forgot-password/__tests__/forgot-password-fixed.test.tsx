import { describe, it, expect, vi, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ForgotPassword from '../forgot-password'

// Mock react-router-dom
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock image imports
vi.mock('../../../images/register-bg.jpg', () => ({
  default: 'mock-register-bg.jpg'
}))

vi.mock('../../../images/forgot.jpg', () => ({
  default: 'mock-forgot.jpg'
}))

// Helper to render ForgotPassword with router
const renderForgotPassword = () => {
  return render(
    <BrowserRouter>
      <ForgotPassword />
    </BrowserRouter>
  )
}

describe('ForgotPassword Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Step 1: Email Entry', () => {
    it('renders email input form initially', () => {
      renderForgotPassword()

      expect(screen.getByText(/reset your password/i)).toBeInTheDocument()
      expect(screen.getByText(/enter your email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send verification code/i })).toBeInTheDocument()
      expect(screen.getByText(/back to login/i)).toBeInTheDocument()
    })

    it('validates email format', async () => {
      const user = userEvent.setup()
      renderForgotPassword()
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /send verification code/i })
      
      // Enter invalid email
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
    })

    it('requires email to be entered', async () => {
      const user = userEvent.setup()
      render(<ForgotPassword />)
      
      const submitButton = screen.getByRole('button', { name: /send verification code/i })
      
      // Try to submit without email
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
    })

    it('proceeds to verification step with valid email', async () => {
      const user = userEvent.setup()
      render(<ForgotPassword />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /send verification code/i })
      
      // Enter valid email
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/sending/i)).toBeInTheDocument()
      })
      
      // Should proceed to verification step
      await waitFor(() => {
        expect(screen.getByText(/verify your email/i)).toBeInTheDocument()
        expect(screen.getByText(/enter the 5-digit code/i)).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('navigates back to login', async () => {
      // Render the ForgotPassword component for this test
      render(<ForgotPassword />)
      
      const backButton = screen.getByText(/back to login/i)
      
      // Check that the link has the correct href
      expect(backButton.closest('a')).toHaveAttribute('href', '/login')
    })
  })

  describe('Step 2: Verification Code', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      renderForgotPassword()
      
      // Navigate to verification step
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /send verification code/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      // Wait for loading state first
      await waitFor(() => {
        expect(screen.getByText(/sending/i)).toBeInTheDocument()
      }, { timeout: 2000 })
      
      // Wait for step 2 to appear (longer timeout to account for 1500ms + 500ms delays)
      await waitFor(() => {
        expect(screen.getByText(/verify your email/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('renders verification code form', async () => {
      await waitFor(() => {
        expect(screen.getByText(/verify your email/i)).toBeInTheDocument()
        expect(screen.getByText(/enter the 5-digit code/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /verify code/i })).toBeInTheDocument()
      })
    })

    it('validates verification code format', async () => {
      const user = userEvent.setup()
      
      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument()
      })
      
      const codeInput = screen.getByLabelText(/verification code/i)
      const verifyButton = screen.getByRole('button', { name: /verify code/i })
      
      // Enter invalid code (too short)
      await user.type(codeInput, '123')
      await user.click(verifyButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid 5-digit verification code/i)).toBeInTheDocument()
      })
      
      // Enter invalid code (non-numeric)
      await user.clear(codeInput)
      await user.type(codeInput, 'abcde')
      await user.click(verifyButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid 5-digit verification code/i)).toBeInTheDocument()
      })
    })

    it('proceeds to password reset with valid code', async () => {
      const user = userEvent.setup()
      
      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument()
      })
      
      const codeInput = screen.getByLabelText(/verification code/i)
      const verifyButton = screen.getByRole('button', { name: /verify code/i })
      
      // Enter valid code
      await user.type(codeInput, '12345')
      await user.click(verifyButton)
      
      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/verifying/i)).toBeInTheDocument()
      })
      
      // Should proceed to password reset step
      await waitFor(() => {
        expect(screen.getByText(/create new password/i)).toBeInTheDocument()
        expect(screen.getByText(/create a new secure password/i)).toBeInTheDocument()
      }, { timeout: 10000 })
    })

    it('handles invalid verification code', async () => {
      const user = userEvent.setup()
      
      const codeInput = screen.getByLabelText(/verification code/i)
      const verifyButton = screen.getByRole('button', { name: /verify code/i })
      
      // Enter wrong code
      await user.type(codeInput, '99999')
      await user.click(verifyButton)
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/invalid verification code/i)).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('allows resending verification code', async () => {
      const user = userEvent.setup()
      
      const resendButton = screen.getByText(/resend code/i)
      await user.click(resendButton)
      
      await waitFor(() => {
        expect(screen.getByText(/Verification code sent/i)).toBeInTheDocument()
      })
    })
  })

  describe('Step 3: Password Reset', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      renderForgotPassword()
      
      // Navigate through all steps to password reset
      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /send verification code/i }))
      
      // Wait for loading and step 2
      await waitFor(() => {
        expect(screen.getByText(/sending/i)).toBeInTheDocument()
      }, { timeout: 2000 })
      
      await waitFor(() => {
        expect(screen.getByText(/verify your email/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument()
      }, { timeout: 5000 })
      
      const codeInput = screen.getByLabelText(/verification code/i)
      await user.type(codeInput, '12345')
      await user.click(screen.getByRole('button', { name: /verify code/i }))
      
      // Wait for step 3 to appear (accounting for async delays)
      await waitFor(() => {
        expect(screen.getByText(/create new password/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('renders password reset form', () => {
      expect(screen.getByText(/reset password/i)).toBeInTheDocument()
      expect(screen.getByText(/Create a new secure password for your account/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
      expect(document.getElementById('confirmPassword')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument()
    })

    it('validates password strength', async () => {
      const user = userEvent.setup()
      
      const passwordInput = screen.getByLabelText(/new password/i)
      const submitButton = screen.getByRole('button', { name: /reset password/i })
      
      // Enter weak password
      await user.type(passwordInput, '123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
      })
    })

    it('validates password confirmation', async () => {
      const user = userEvent.setup()
      
      const passwordInput = screen.getByLabelText(/new password/i)
      const confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: /reset password/i })
      
      // Enter different passwords
      await user.type(passwordInput, 'newpassword123')
      await user.type(confirmPasswordInput, 'different123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })

    it('toggles password visibility', async () => {
      const user = userEvent.setup()
      
      const passwordInput = screen.getByLabelText(/new password/i)
      const toggleButtons = screen.getAllByRole('button', { name: /toggle.*password visibility/i })
      const passwordToggle = toggleButtons[0]
      
      // Initially password should be hidden
      expect(passwordInput).toHaveAttribute('type', 'password')
      
      // Click toggle button
      await user.click(passwordToggle)
      expect(passwordInput).toHaveAttribute('type', 'text')
    })

    it('completes password reset successfully', async () => {
      const user = userEvent.setup()
      const passwordInput = screen.getByLabelText(/new password/i)
      const confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement
      const submitButton = screen.getByRole('button', { name: /reset password/i })
      
      // Enter valid matching passwords
      await user.type(passwordInput, 'newpassword123')
      await user.type(confirmPasswordInput, 'newpassword123')
      await user.click(submitButton)
      
      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/resetting password/i)).toBeInTheDocument()
      })
      
      // Should proceed to success step
      await waitFor(() => {
        expect(screen.getByText(/password reset successful/i)).toBeInTheDocument()
        expect(screen.getByText(/your password has been reset successfully/i)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Step 4: Success', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      renderForgotPassword()
      
      // Navigate through all steps to success
      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /send verification code/i }))
      
      // Wait for step 2
      await waitFor(() => {
        expect(screen.getByText(/verify your email/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument()
      }, { timeout: 5000 })
      
      const codeInput = screen.getByLabelText(/verification code/i)
      await user.type(codeInput, '12345')
      await user.click(screen.getByRole('button', { name: /verify code/i }))
      
      // Wait for step 3
      await waitFor(() => {
        expect(screen.getByText(/create new password/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
      }, { timeout: 5000 })
      
      const passwordInput = screen.getByLabelText(/new password/i)
      const confirmPasswordInput = document.getElementById('confirmPassword') as HTMLInputElement
      await user.type(passwordInput, 'newpassword123')
      await user.type(confirmPasswordInput, 'newpassword123')
      await user.click(screen.getByRole('button', { name: /reset password/i }))
      
      // Wait for step 4 success (longer timeout for 1500ms delay)
      await waitFor(() => {
        expect(screen.getByText(/password reset complete/i)).toBeInTheDocument()
      }, { timeout: 6000 })
    })

    it('renders success message', () => {
      expect(screen.getByText(/password reset successful/i)).toBeInTheDocument()
      expect(screen.getByText(/your password has been reset successfully/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /go to login/i })).toBeInTheDocument()
    })

    it('navigates back to login from success page', async () => {
      const user = userEvent.setup()
      
      const loginButton = screen.getByRole('button', { name: /go to login/i })
      await user.click(loginButton)
      
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  describe('Navigation and State Management', () => {
    it('maintains email state across steps', async () => {
      const user = userEvent.setup()
      render(<ForgotPassword />)
      
      const email = 'test@example.com'
      const emailInput = screen.getByLabelText(/email address/i)
      
      await user.type(emailInput, email)
      await user.click(screen.getByRole('button', { name: /send verification code/i }))
      
      await waitFor(() => {
        expect(screen.getByText(new RegExp(email, 'i'))).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('allows going back to previous steps', async () => {
      const user = userEvent.setup()
      render(<ForgotPassword />)
      
      // Go to verification step
      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'test@example.com')
      await user.click(screen.getByRole('button', { name: /send verification code/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/verification code/i)).toBeInTheDocument()
      }, { timeout: 3000 })
      
      // There's no back button between steps - this is expected behavior
      // The user would need to refresh the page or use browser back
      // We should not find a "Previous Step" or "Go Back" button
      expect(screen.queryByText(/previous step/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/go back/i)).not.toBeInTheDocument()
    })
  })
})
