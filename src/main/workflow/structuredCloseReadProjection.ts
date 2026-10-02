import fs from "node:fs";
import path from "node:path";
import {selectedCurrentProjectId} from "../projectState/currentProjectRegistrationService";
import {readIntakeAdapterSnapshot} from "../projectState/sqliteProjectStateStore";
export function readStructuredCloseState(root:string,phaseKey?:string){
 const projectId=selectedCurrentProjectId(root,{includeClosed:true});if(!projectId)return null;
 const snapshot=readIntakeAdapterSnapshot(path.join(fs.realpathSync(root),".champcity","project-state.sqlite"),projectId),{records,relationships}=snapshot;
 const workflows=records.filter(record=>record.entityType==="Workflow"&&record.body.workflowType==="project-creation"&&["active","closed"].includes(record.lifecycleState));
 if(workflows.length!==1)return {projectClosed:false,phaseClosed:false,phaseId:phaseKey};
 const workflow=workflows[0],project=snapshot.project;
 const phases=records.filter(record=>record.entityType==="Phase"&&(record.id===phaseKey||record.body.phaseKey===phaseKey)&&relationships.some(edge=>!edge.endedAt&&edge.relationshipType==="part_of"&&edge.fromEntityId===record.id&&edge.toEntityId===workflow.id));
 return {projectClosed:project?.lifecycleState==="closed"&&workflow.lifecycleState==="closed",phaseClosed:phases.length===1&&phases[0].entityType==="Phase"&&phases[0].body.phaseState==="closed",phaseId:phases.length===1?phases[0].id:phaseKey};
}
