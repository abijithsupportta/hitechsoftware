'use client';

import { useState } from 'react';
import { User, Building, Shield, Bell, Database, Palette, Globe, HelpCircle, Settings as SettingsIcon, RotateCcw, Save } from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants/routes';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  const settingsSections = [
    {
      id: 'profile',
      title: 'Profile Settings',
      description: 'Manage your personal information and preferences',
      icon: User,
      href: ROUTES.DASHBOARD_SETTINGS_PROFILE,
      color: 'bg-blue-500'
    },
    {
      id: 'company',
      title: 'Company Settings',
      description: 'Configure company information and business details',
      icon: Building,
      href: ROUTES.DASHBOARD_SETTINGS_COMPANY,
      color: 'bg-purple-500'
    },
    {
      id: 'system',
      title: 'System Settings',
      description: 'System configuration and administrative settings',
      icon: Shield,
      href: ROUTES.DASHBOARD_SETTINGS_SYSTEM,
      color: 'bg-green-500'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Manage notification preferences and alerts',
      icon: Bell,
      href: '#',
      color: 'bg-orange-500'
    },
    {
      id: 'database',
      title: 'Database',
      description: 'Database maintenance and backup settings',
      icon: Database,
      href: '#',
      color: 'bg-red-500'
    },
    {
      id: 'appearance',
      title: 'Appearance',
      description: 'Customize the look and feel of the application',
      icon: Palette,
      href: '#',
      color: 'bg-pink-500'
    },
    {
      id: 'integrations',
      title: 'Integrations',
      description: 'Manage third-party integrations and APIs',
      icon: Globe,
      href: '#',
      color: 'bg-indigo-500'
    },
    {
      id: 'help',
      title: 'Help & Support',
      description: 'Get help and access support resources',
      icon: HelpCircle,
      href: '#',
      color: 'bg-gray-500'
    }
  ];

  const quickActions = [
    { title: 'Change Password', description: 'Update your account password', action: 'change-password' },
    { title: 'Export Data', description: 'Export your data in various formats', action: 'export-data' },
    { title: 'Backup Settings', description: 'Create a backup of your settings', action: 'backup-settings' },
    { title: 'System Health', description: 'Check system status and performance', action: 'system-health' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Manage your account and system preferences</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {settingsSections.map((section) => (
            <Link
              key={section.id}
              href={section.href}
              className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 group"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 ${section.color} rounded-lg group-hover:scale-110 transition-transform duration-200 flex-shrink-0`}>
                  <section.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">{section.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{section.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                      <SettingsIcon className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                    </div>
                    <h4 className="font-medium text-gray-900">{action.title}</h4>
                  </div>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">System Information</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Application Details
                </h3>
                <dl className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-600">Version</dt>
                    <dd className="text-sm font-medium text-gray-900">v2.1.0</dd>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-600">Environment</dt>
                    <dd className="text-sm font-medium text-gray-900">Production</dd>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-600">Last Updated</dt>
                    <dd className="text-sm font-medium text-gray-900">March 28, 2026</dd>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <dt className="text-sm text-gray-600">Build Number</dt>
                    <dd className="text-sm font-medium text-gray-900">#20260328-001</dd>
                  </div>
                </dl>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Database Status
                </h3>
                <dl className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-600">Connection</dt>
                    <dd className="text-sm font-medium text-green-600 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Healthy
                    </dd>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-600">Last Backup</dt>
                    <dd className="text-sm font-medium text-gray-900">2 hours ago</dd>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <dt className="text-sm text-gray-600">Storage Used</dt>
                    <dd className="text-sm font-medium text-gray-900">2.4 GB</dd>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <dt className="text-sm text-gray-600">Uptime</dt>
                    <dd className="text-sm font-medium text-gray-900">99.8%</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Settings Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Security Settings */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Settings
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                </div>
                <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
                  Enable
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Session Timeout</h4>
                  <p className="text-sm text-gray-600">Automatically log out after inactivity</p>
                </div>
                <select className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>30 minutes</option>
                  <option>1 hour</option>
                  <option>2 hours</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Preferences
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Email Notifications</h4>
                  <p className="text-sm text-gray-600">Receive updates via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Push Notifications</h4>
                  <p className="text-sm text-gray-600">Receive browser push notifications</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
