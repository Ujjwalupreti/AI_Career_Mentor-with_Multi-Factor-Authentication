import React from 'react';

const JobsTasksSection = ({ jobs = [], tasks = [] }) => (
  <>
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">Task Board</h2>
      {tasks.length ? tasks.slice(0, 6).map(t => (
        <div key={t.id || t.title} className="p-2 bg-gray-50 rounded mb-2">{t.title}</div>
      )) : <p className="text-gray-500 text-sm">No tasks assigned yet.</p>}
    </div>

    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4">Job Match Analysis</h2>
      {jobs.length ? jobs.map(job => (
        <div key={job.title} className="border rounded-lg p-4 mb-3">
          <div className="flex justify-between mb-3">
            <div>
              <h3 className="font-bold">{job.title}</h3>
              <p className="text-sm text-gray-600">{job.company}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{job.match || 0}%</div>
              <div className="text-xs text-gray-500">Match Score</div>
            </div>
          </div>
        </div>
      )) : <p className="text-gray-500">No job matches found.</p>}
    </div>
  </>
);

export default JobsTasksSection;