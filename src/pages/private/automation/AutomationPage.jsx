import React from "react";
import UploadForm from "./UploadForm";
import JobList from "./JobList";
import JobHistory from "./JobHistory";
import MessageComposer from "./MessageComposer";
import ProfileManager from "./ProfileManager";

const AutomationPage = () => {
  const [selectedJob, setSelectedJob] = React.useState(null);
  return (
    <div style={{ padding: 20 }}>
      <h2>WhatsApp Automations</h2>
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <UploadForm onCreated={(job) => setSelectedJob(job)} />
          <JobList onSelect={(job) => setSelectedJob(job)} />
        </div>
        <div style={{ width: 520 }}>
          <MessageComposer selectedJob={selectedJob} />
          <ProfileManager />
          <div style={{ marginTop: 18 }}>
            <JobHistory jobId={selectedJob?._id} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationPage;

