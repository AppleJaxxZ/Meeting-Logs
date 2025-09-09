import React, { useState, useEffect } from 'react';
import SignaturePad from './SignaturePad';
import CurrentAddressButton from './CurrentAddressButton';

function AttendanceRow({ index, rowData, updateRow }) {
  const [localData, setLocalData] = useState(rowData);

  useEffect(() => {
    updateRow(index, localData);
  }, [localData, index, updateRow]);

  return (
    <tr>
      <td><input value={localData.date} onChange={e => setLocalData({ ...localData, date: e.target.value })} /></td>
      <td><input value={localData.time} onChange={e => setLocalData({ ...localData, time: e.target.value })} /></td>
      <td><input value={localData.meetingName} onChange={e => setLocalData({ ...localData, meetingName: e.target.value })} /></td>
      <td>
        <CurrentAddressButton />
        <input value={localData.location} onChange={e => setLocalData({ ...localData, location: e.target.value })} />
      </td>
      <td><SignaturePad /></td>
      <td>
        <textarea
          rows={5}
          cols={50}
          value={localData.impact}
          onChange={e => setLocalData({ ...localData, impact: e.target.value })}
        />
      </td>
    </tr>
  );
}

export default AttendanceRow;