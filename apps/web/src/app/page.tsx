import React from 'react';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-8 font-sans">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-blue-500">ROSC MEDIA OS</h1>
          <p className="text-neutral-400 mt-1">The Complete Digital Operating System for Church Media Ministries</p>
        </div>
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700">
            <span className="text-sm font-medium">JD</span>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="col-span-1 md:col-span-3 grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          {[
            { label: 'Active Projects', value: '12', color: 'text-blue-400' },
            { label: 'Pending Tasks', value: '34', color: 'text-amber-400' },
            { label: 'Media Assets', value: '1.2k', color: 'text-emerald-400' },
            { label: 'Storage Used', value: '45%', color: 'text-purple-400' },
          ].map((stat, i) => (
            <div key={i} className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl">
              <p className="text-sm text-neutral-500 font-medium">{stat.label}</p>
              <p className={`text-2xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Today's Projects */}
        <section className="col-span-1 md:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-6">Today's Projects</h2>
          <div className="space-y-4">
            {[
              { title: 'Sunday Service Graphics', status: 'In Progress', deadline: 'Today, 5 PM' },
              { title: 'Youth Conference Promo Video', status: 'Review', deadline: 'Tomorrow' },
              { title: 'New Sermon Series Branding', status: 'Planned', deadline: 'Next Week' },
            ].map((project, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-neutral-950 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors cursor-pointer">
                <div>
                  <h3 className="font-medium">{project.title}</h3>
                  <p className="text-xs text-neutral-500 mt-1">Deadline: {project.deadline}</p>
                </div>
                <span className="px-3 py-1 bg-neutral-800 text-xs rounded-full text-neutral-300 border border-neutral-700">
                  {project.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="col-span-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              'New Project',
              'Upload Media',
              'Open Editor',
              'Schedule Post',
              'AI Generator',
              'Equipment Check',
            ].map((action, i) => (
              <button key={i} className="p-3 bg-neutral-800 hover:bg-neutral-700 text-sm rounded-xl transition-colors border border-neutral-700">
                {action}
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-12 pt-8 border-t border-neutral-900 text-neutral-600 text-sm flex justify-between">
        <p>&copy; 2024 ROSC MEDIA OS. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-neutral-400">Documentation</a>
          <a href="#" className="hover:text-neutral-400">Support</a>
          <a href="#" className="hover:text-neutral-400">Settings</a>
        </div>
      </footer>
    </div>
  );
}
