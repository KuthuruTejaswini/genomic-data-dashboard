import React, { useState } from 'react';

const FileUploadDashboard = () => {
  const [files, setFiles] = useState({
    design: null,
    counts: null
  });
  
  const [uploadStatus, setUploadStatus] = useState({
    design: { type: 'idle', message: '' },
    counts: { type: 'idle', message: '' }
  });

  const handleFileChange = (fileType) => (event) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      setFiles(prev => ({ ...prev, [fileType]: file }));
      setUploadStatus(prev => ({
        ...prev,
        [fileType]: { type: 'idle', message: '' }
      }));
    } else {
      setUploadStatus(prev => ({
        ...prev,
        [fileType]: {
          type: 'error',
          message: 'Please select a CSV file.'
        }
      }));
    }
  };

  const handleFileUpload = async (fileType) => {
    const file = files[fileType];
    if (!file) {
      setUploadStatus(prev => ({
        ...prev,
        [fileType]: {
          type: 'error',
          message: 'Please select a file first.'
        }
      }));
      return;
    }

    setUploadStatus(prev => ({
      ...prev,
      [fileType]: { type: 'loading', message: 'Uploading file...' }
    }));

    const formData = new FormData();
    formData.append(fileType === 'design' ? 'design_file' : 'file', file);

    const endpoint = fileType === 'design' 
      ? 'http://127.0.0.1:5000/api/upload_design'
      : 'http://127.0.0.1:5000/api/upload/raw_counts';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus(prev => ({
          ...prev,
          [fileType]: {
            type: 'success',
            message: `${fileType === 'design' ? 'Design' : 'Raw counts'} file uploaded successfully.`
          }
        }));
        setFiles(prev => ({ ...prev, [fileType]: null }));
      } else {
        setUploadStatus(prev => ({
          ...prev,
          [fileType]: {
            type: 'error',
            message: `Failed to upload file: ${data.error}`
          }
        }));
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadStatus(prev => ({
        ...prev,
        [fileType]: {
          type: 'error',
          message: 'Network error while uploading file.'
        }
      }));
    }
  };

  const FileUploadSection = ({ type, title, format }) => (
    <div className="mb-8 p-6 bg-white rounded-lg shadow">
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Select {title} (CSV)
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange(type)}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0 file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      <button
        onClick={() => handleFileUpload(type)}
        disabled={!files[type] || uploadStatus[type].type === 'loading'}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md
          hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {uploadStatus[type].type === 'loading' ? 'Uploading...' : 'Upload'}
      </button>

      {uploadStatus[type].message && (
        <div className={`mt-4 p-4 rounded-md ${
          uploadStatus[type].type === 'error' ? 'bg-red-100 text-red-700' : 
          uploadStatus[type].type === 'success' ? 'bg-green-100 text-green-700' : 
          'bg-blue-100 text-blue-700'
        }`}>
          <p>{uploadStatus[type].message}</p>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p className="font-medium mb-2">Required CSV Format:</p>
        <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
          {format}
        </pre>
      </div>
    </div>
  );

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Gene Expression Analysis Dashboard</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        <FileUploadSection 
          type="counts"
          title="Upload Raw Counts File"
          format={`Gene,Sample1,Sample2,Sample3\nGENE1,100,150,200\nGENE2,50,75,80`}
        />
        
        <FileUploadSection 
          type="design"
          title="Upload Experiment Design File"
          format={`sample,condition\nCA.102548,control\nCA.104338,control\nCA.105094,control`}
        />
      </div>
    </div>
  );
};

export default FileUploadDashboard;