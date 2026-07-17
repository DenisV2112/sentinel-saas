import React from "react";
import Sidebar from "@/components/commons/Sidebar";
import { useTheme } from "@/utils/store/themeContext";
import { motion } from "framer-motion";
import {
  Palette,
  Sun,
  Moon,
  Check,
  Shield,
  Bell,
  ChevronRight,
} from "lucide-react";

export default function SettingsPage() {
  const { mode, setTheme } = useTheme();

  return (
    <div className="settings-layout">
      <Sidebar activeItem="settings" />

      <main className="settings-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
        {/* HEADER */}
        <header
          className="settings-header"
          style={{ borderBottomColor: 'var(--color-border)' }}
        >
          <h1 style={{ color: 'var(--color-text-primary)' }}>
            <Shield size={20} />
            System Settings
          </h1>
        </header>

        {/* CONTENT */}
        <section className="settings-content">
          {/* APPEARANCE */}
          <h2
            className="settings-section-title"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <Palette size={18} />
            Appearance
          </h2>

          <div
            className="settings-card"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="setting-row">
              <div>
                <span className="setting-title">Theme Mode</span>
                <span className="setting-desc">
                  Customize the interface appearance
                </span>
              </div>

              <div className="theme-toggle">
                <button
                  aria-label="Dark theme"
                  className={mode === "dark" ? "active" : ""}
                  onClick={() => setTheme("dark")}
                  style={{
                    background: mode === "dark" ? 'var(--color-primary)' : "transparent",
                    color: mode === "dark" ? 'var(--color-on-primary)' : 'var(--color-text-secondary)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <Moon size={16} />
                  Dark
                  {mode === "dark" && <Check size={14} />}
                </button>

                <button
                  aria-label="Light theme"
                  className={mode === "light" ? "active" : ""}
                  onClick={() => setTheme("light")}
                  style={{
                    background: mode === "light" ? 'var(--color-primary)' : "transparent",
                    color: mode === "light" ? 'var(--color-on-primary)' : 'var(--color-text-secondary)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <Sun size={16} />
                  Light
                  {mode === "light" && <Check size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* NOTIFICATIONS */}
          <h2 className="settings-section-title" style={{ color: 'var(--color-text-primary)' }}>
            <Bell size={18} />
            Notifications
          </h2>

          <div
            className="settings-card"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="setting-link">
              <div>
                <span className="setting-title">Email Alerts</span>
                <span className="setting-desc">
                  Manage critical finding emails
                </span>
              </div>
              <ChevronRight size={18} />
            </div>

            <div className="setting-link">
              <div>
                <span className="setting-title">Integration Webhooks</span>
                <span className="setting-desc">
                  Slack, Jira and external services
                </span>
              </div>
              <ChevronRight size={18} />
            </div>
          </div>
        </section>
        </motion.div>
      </main>
    </div>
  );
}
