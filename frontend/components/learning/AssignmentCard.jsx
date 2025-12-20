import React from 'react';

const AssignmentCard = ({ assignment }) => (
  <div className="border-2 border-gray-200 rounded-lg p-4">
    <h4 className="font-bold">{assignment.title}</h4>
    <p className="text-sm text-gray-600">{assignment.description}</p>
    <div className="mt-3 flex justify-between items-center">
      <span className="text-xs text-gray-500">{assignment.due || 'No due date'}</span>
      <button className="text-sm text-blue-600">Start</button>
    </div>
  </div>
);

export default AssignmentCard;