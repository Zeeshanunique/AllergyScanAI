import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Heart, Github, Twitter, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
                <ShieldCheck className="text-white" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">AllergyGuard</h3>
                <p className="text-sm text-muted-foreground">AI-Powered Safety</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Protecting lives through intelligent food safety analysis. Scan, analyze, and stay safe with our AI-powered allergy detection system.
            </p>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="w-10 h-10 p-0">
                <Github size={16} />
              </Button>
              <Button variant="outline" size="sm" className="w-10 h-10 p-0">
                <Twitter size={16} />
              </Button>
              <Button variant="outline" size="sm" className="w-10 h-10 p-0">
                <Mail size={16} />
              </Button>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/scanner">
                  <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                    Food Scanner
                  </Button>
                </Link>
              </li>
              <li>
                <Link href="/history">
                  <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                    Scan History
                  </Button>
                </Link>
              </li>
              <li>
                <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                  AI Assistant
                </Button>
              </li>
              <li>
                <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                  Mobile App
                </Button>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-3">
              <li>
                <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                  About Us
                </Button>
              </li>
              <li>
                <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                  Privacy Policy
                </Button>
              </li>
              <li>
                <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                  Terms of Service
                </Button>
              </li>
              <li>
                <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                  Contact Support
                </Button>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Mail size={14} />
                <span>support@allergyguard.com</span>
              </li>
              <li className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Phone size={14} />
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex items-start space-x-2 text-sm text-muted-foreground">
                <MapPin size={14} className="mt-0.5" />
                <span>123 Health Tech Ave<br />San Francisco, CA 94102</span>
              </li>
            </ul>

            {/* Emergency Notice */}
            <div className="mt-6 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                ⚠️ Emergency: Call 911
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                This app is not a substitute for medical advice.
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Bottom Section */}
        <div className="py-6 flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>© {currentYear} AllergyGuard. All rights reserved.</span>
            <Separator orientation="vertical" className="h-4" />
            <span>Made with</span>
            <Heart className="w-4 h-4 text-red-500 fill-current" />
            <span>for food safety</span>
          </div>

          <div className="flex items-center space-x-6 text-sm">
            <Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-foreground">
              Privacy
            </Button>
            <Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-foreground">
              Terms
            </Button>
            <Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-foreground">
              Cookies
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}