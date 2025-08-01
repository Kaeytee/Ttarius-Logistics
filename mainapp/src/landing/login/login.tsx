import { useState, useRef, useEffect } from "react";
import { Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider';
import { apiService } from '../../services/api';
import DeliveryImage from '../../images/deliveryparcel.jpg';
import LoginBg from '../../images/register-bg.jpg';
// Import Google reCAPTCHA component
import ReCAPTCHA from 'react-google-recaptcha';
// Import reCAPTCHA configuration
import { recaptchaConfig } from '../../config/recaptcha';

/**
 * Extend Window interface to include grecaptcha property
 * This fixes TypeScript errors when accessing window.grecaptcha
 */
declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      render: (container: string | HTMLElement, parameters: object) => number;
    };
  }
}

/**
 * Login Component
 * Handles user authentication with enhanced reCAPTCHA integration
 * @author Senior Software Engineer
 */
export default function Login() {
	// Form state variables
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [rememberMe, setRememberMe] = useState(false);
	const [error, setError] = useState("");
	
	// reCAPTCHA state
	const [captchaValue, setCaptchaValue] = useState<string | null>(null);
	const [recaptchaError, setRecaptchaError] = useState(false);
	const recaptchaRef = useRef<ReCAPTCHA>(null);
	
	const { setUser } = useAuth();
	const navigate = useNavigate();
	
	/**
	 * Check if reCAPTCHA script is loaded and available
	 * This helps detect issues with script loading in production
	 */
	useEffect(() => {
		// Check if reCAPTCHA is enabled in config
		if (!recaptchaConfig.enabled || recaptchaConfig.siteKey === 'disabled') {
			return;
		}

		// Only inject if not already present
		if (!document.querySelector('script[src*="recaptcha"]')) {
			// Create script element WITHOUT the problematic callback
			const script = document.createElement('script');
			script.src = `https://www.google.com/recaptcha/api.js`;
			script.async = true;
			script.defer = true;
			
			// Add onload handler to detect successful script loading
			script.onload = () => {
				console.log('✅ reCAPTCHA script loaded successfully');
				// Give a shorter delay for grecaptcha to initialize
				setTimeout(() => {
					if (window.grecaptcha) {
						console.log('✅ reCAPTCHA object available, waiting for ready state...');
						window.grecaptcha.ready(() => {
							console.log('✅ reCAPTCHA is ready and initialized');
							setRecaptchaError(false);
						});
					} else {
						console.log('⚠️ reCAPTCHA object not available yet, but proceeding anyway');
						// Still set loading to false so the component can try to render
						setRecaptchaError(false);
					}
				}, 800); // Reduced delay
			};
			
			// Add error handler
			script.onerror = () => {
				console.error('❌ Failed to load reCAPTCHA script');
				setRecaptchaError(true);
			};
			
			// Append to document
			document.head.appendChild(script);
			console.log('📝 reCAPTCHA script injected (without callback)');
		}
	}, []);

	/**
	 * Handle reCAPTCHA change
	 * @param {string | null} value - The reCAPTCHA token value
	 */
	const handleCaptchaChange = (value: string | null) => {
		setCaptchaValue(value);
		setRecaptchaError(false);
		if (value) {
			setError("");
		}
	};

	/**
	 * Handle reCAPTCHA expiration
	 */
	const handleCaptchaExpired = () => {
		setCaptchaValue(null);
		setError("reCAPTCHA has expired. Please verify again.");
	};

	/**
	 * Handle reCAPTCHA error (when it fails to load)
	 */
	const handleCaptchaError = () => {
		setRecaptchaError(true);
		setError("reCAPTCHA failed to load. Please check your internet connection and try again.");
	};

	/**
	 * Handle login form submission using API
	 */
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError("");

		// Validate reCAPTCHA (only if reCAPTCHA is enabled, loaded without errors, and we're not in a fallback state)
		if (recaptchaConfig.enabled && recaptchaConfig.siteKey !== 'disabled' && !recaptchaError && !captchaValue) {
			setError("Please verify that you are not a robot.");
			return;
		}

		setIsLoading(true);

		try {
			// Send the reCAPTCHA token along with login credentials for server-side verification
			const response = await apiService.login(email, password, captchaValue || undefined);
			
			if (response.success && response.data) {
				// Map UserProfile to User interface
				const user = {
					id: response.data.user.id,
					name: `${response.data.user.firstName} ${response.data.user.lastName}`,
					email: response.data.user.email,
					image: response.data.user.profileImage,
					phone: response.data.user.phone,
					address: response.data.user.address,
					city: response.data.user.city,
					state: response.data.user.state,
					zip: response.data.user.zip,
					country: response.data.user.country,
					emailVerified: response.data.user.emailVerified,
					accountStatus: response.data.user.accountStatus
				};
				
				// Set user in AuthContext
				setUser(user);
				
				// Store auth data
				localStorage.setItem('authToken', response.data.token);
				localStorage.setItem('user', JSON.stringify(user));
				
				// Navigate to main app/dashboard
				navigate('/app');
			} else {
				setError(response.error || 'Login failed. Please try again.');
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
		} finally {
			setIsLoading(false);
		}
	};

	// Check if form is valid for submission
	const isFormValid = email && password && (
		!recaptchaConfig.enabled || recaptchaError || captchaValue
	);

	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4" style={{ backgroundImage: `url(${LoginBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
			<div className="w-full max-w-4xl bg-white shadow-2xl rounded-2xl overflow-hidden">
				<div className="flex flex-col lg:flex-row min-h-[600px]">
					{/* Left panel: Delivery image */}
					<div className="w-full lg:w-1/2 bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center p-8" style={{ backgroundImage: `url(${DeliveryImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
						<div className="w-32 h-32 mx-auto mb-6 bg-white/20 rounded-full flex items-center justify-center">
							<svg className="w-20 h-20" fill="none" viewBox="0 0 24 24">
								<path d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM10 6a2 2 0 0 1 4 0v1h-4V6zm8 13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v10z"/>
							</svg>
						</div>
						<h3 className="text-2xl font-bold mb-2 text-transparent">Secure Logistics</h3>
						<p className="text-transparent">Your trusted delivery partner</p>
					</div>

					{/* Right panel: Login form */}
					<div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
						<div className="max-w-sm mx-auto w-full">
							<div className="mb-8 text-center lg:text-left">
								<h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
								<p className="text-gray-600">Begin your logistics journey here</p>
							</div>

							<form onSubmit={handleSubmit} className="space-y-6">
								{/* Error Message */}
								{error && (
									<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
										{error}
									</div>
								)}

								{/* Email Field */}
								<div>
									<label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
										Email Address *
									</label>
									<input
										type="email"
										id="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										placeholder="you@example.com"
										className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 outline-none"
										required
									/>
								</div>

								{/* Password Field */}
								<div>
									<label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
										Password *
									</label>
									<div className="relative">
										<input
											type={showPassword ? "text" : "password"}
											id="password"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											placeholder="••••••••"
											className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 outline-none"
											required
										/>
										<button
											type="button"
											className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
											onClick={() => setShowPassword(!showPassword)}
										>
											{showPassword ? (
												<EyeOff className="w-5 h-5" />
											) : (
												<Eye className="w-5 h-5" />
											)}
										</button>
									</div>
								</div>

								{/* Remember Me & Forgot Password */}
								<div className="flex items-center justify-between">
									<label className="flex items-center space-x-2 cursor-pointer">
										<input
											type="checkbox"
											checked={rememberMe}
											onChange={(e) => setRememberMe(e.target.checked)}
											className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-red-500"
										/>
										<span className="text-sm text-gray-700">Remember Me</span>
									</label>

									{/* Link to Forgot Password page */}
									<Link
										to="/forgot-password"
										className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
									>
										Forgot password?
									</Link>
								</div>

								{/* Google reCAPTCHA */}
								{recaptchaConfig.enabled && recaptchaConfig.siteKey && (
									<div className="recaptcha-container">
										<ReCAPTCHA
											ref={recaptchaRef}
											sitekey={recaptchaConfig.siteKey}
											theme={recaptchaConfig.theme}
											size={recaptchaConfig.size}
											onChange={handleCaptchaChange}
											onExpired={handleCaptchaExpired}
											onErrored={handleCaptchaError}
											className="mt-2 mb-2"
										/>
									</div>
								)}

								{/* Submit Button */}
								<button
									type="submit"
									disabled={!isFormValid || isLoading}
									className={`w-full font-semibold px-6 py-3 rounded-lg transition-all duration-200 flex items-center justify-center ${
										isFormValid && !isLoading
											? "bg-red-500 hover:bg-red-600 text-white transform hover:scale-105 hover:shadow-lg"
											: "bg-gray-300 text-gray-500 cursor-not-allowed"
									}`}
								>
									{isLoading ? (
										<>
											<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2 animate-spin" />
											Signing in...
										</>
									) : (
										'Sign In'
									)}
								</button>

								{/* Register Link */}
								<div className="text-center pt-4">
									<p className="text-sm text-gray-600">
										Don't have an account?{' '}
										{/* Link to Register page */}
										<Link
											to="/register"
											className="text-red-500 hover:text-red-600 font-medium transition-colors"
										>
											Register
										</Link>
									</p>
								</div>
							</form>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
