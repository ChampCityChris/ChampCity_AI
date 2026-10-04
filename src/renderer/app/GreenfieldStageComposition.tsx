import type {ReactNode} from "react";
import type {ProjectIntakeSubmission} from "../../shared/workspaceContracts";
import type {GreenfieldStage} from "../../shared/greenfieldNavigationContracts";
import {ProjectIntakeWorkspace} from "./ProjectIntakeWorkspace";
import {GreenfieldArchitectWorkspace} from "./GreenfieldArchitectWorkspace";
import {StructuredProjectPlanningWorkspace} from "./StructuredProjectPlanningWorkspace";
import {StructuredPhaseMapWorkspace} from "./StructuredPhaseMapWorkspace";
import {PhaseInterviewWorkspace} from "./PhaseInterviewWorkspace";
import {PhasePlanningWorkspace} from "./PhasePlanningWorkspace";
import {WorkCardMapWorkspace} from "./WorkCardMapWorkspace";
import {WorkCardIntakeWorkspace} from "./WorkCardIntakeWorkspace";
import {WorkCardPlanningWorkspace} from "./WorkCardPlanningWorkspace";
import {WorkCardImplementWorkspace} from "./WorkCardImplementWorkspace";
import {WorkCardReviewValidationWorkspace} from "./WorkCardReviewValidationWorkspace";
import {WorkCardValidationWorkspace} from "./WorkCardValidationWorkspace";
import {WorkCardRepairWorkspace} from "./WorkCardRepairWorkspace";
import {WorkCardCloseWorkspace} from "./WorkCardCloseWorkspace";
import {PhaseValidationWorkspace} from "./PhaseValidationWorkspace";
import {PhaseCloseWorkspace} from "./PhaseCloseWorkspace";
import {ProjectValidationWorkspace} from "./ProjectValidationWorkspace";
import {ProjectCloseWorkspace} from "./ProjectCloseWorkspace";

export interface GreenfieldShellSelection {stage:GreenfieldStage;phaseId:string|null;workItemId:string|null;repairId:string|null}
export interface GreenfieldStageCompositionProps {
 workflowId:string;selection:GreenfieldShellSelection;repositoryIdentity:string;browserPanel:ReactNode;
 intake:ProjectIntakeSubmission;onIntakeChange:(value:ProjectIntakeSubmission)=>void;
 resume:()=>Promise<void>;open:(stage:GreenfieldStage,workItemId?:string)=>void;
 terminal:(stage:"work-card-close"|"phase-close"|"project-close")=>void;
 repair:(id:string)=>void;onReturn:()=>void;onRepositoryChange:()=>void;
}
/** Composition only: shell adapters own projections/actions; SQL navigation owns required state. */
export function composeGreenfieldStage(props:GreenfieldStageCompositionProps):ReactNode {
 const {workflowId,selection,browserPanel,resume,open,terminal}=props,{stage,phaseId,workItemId,repairId}=selection;
 const missing=<p role="status">Select an exact SQL Phase / Work Card to inspect this workspace.</p>;
 switch(stage){
 case "project-intake-capture":return <ProjectIntakeWorkspace workflowId={workflowId} value={props.intake} onChange={props.onIntakeChange} repositoryIdentity={props.repositoryIdentity} isChoosingProjectRepository={false} onChooseProjectRepository={props.onRepositoryChange} onRailStatus={()=>{}} onPrepared={resume}/>;
 case "architect-interview":return <GreenfieldArchitectWorkspace workflowId={workflowId} browserVisible={!!browserPanel} browserCompanion={browserPanel} onNext={resume}/>;
 case "project-planning-review":return <StructuredProjectPlanningWorkspace workflowId={workflowId} browserPanel={browserPanel} browserVisible={!!browserPanel} onNext={resume}/>;
 case "project-phase-map":return <StructuredPhaseMapWorkspace workflowId={workflowId} browserPanel={browserPanel} browserVisible={!!browserPanel} onNext={resume}/>;
 case "phase-interview":return phaseId?<PhaseInterviewWorkspace workflowId={workflowId} phaseId={phaseId} browserPanel={browserPanel} browserVisible={!!browserPanel} onNext={resume}/>:missing;
 case "phase-planning-bundle":return phaseId?<PhasePlanningWorkspace workflowId={workflowId} phaseId={phaseId} browserPanel={browserPanel} browserVisible={!!browserPanel} onNext={resume}/>:missing;
 case "phase-work-card-selection":return phaseId?<WorkCardMapWorkspace workflowId={workflowId} phaseId={phaseId} onOpenWorkItem={id=>open("work-card-intake",id)} onOpenPhaseValidation={()=>open("phase-validation")}/>:missing;
 case "work-card-intake":return workItemId?<WorkCardIntakeWorkspace workflowId={workflowId} workItemId={workItemId} onPrepared={()=>open("work-card-planning")}/>:missing;
 case "work-card-planning":return workItemId?<WorkCardPlanningWorkspace workflowId={workflowId} workItemId={workItemId} browserPanel={browserPanel} browserVisible={!!browserPanel} onNext={resume}/>:missing;
 case "work-card-building-review":return workItemId?<WorkCardImplementWorkspace workflowId={workflowId} workItemId={workItemId} onNext={resume}/>:missing;
 case "work-card-report-review":return workItemId?<WorkCardReviewValidationWorkspace workflowId={workflowId} workItemId={workItemId} browserPanel={browserPanel} onClosed={()=>terminal("work-card-close")} onRepair={props.repair} onValidation={()=>open("work-card-validation")}/>:missing;
 case "work-card-validation":return workItemId?<WorkCardValidationWorkspace workflowId={workflowId} workItemId={workItemId} onClosed={()=>terminal("work-card-close")} onRepair={props.repair} onValidation={()=>open("work-card-report-review")}/>:missing;
 case "work-card-repair":return repairId?<WorkCardRepairWorkspace workflowId={workflowId} repairId={repairId} browserPanel={browserPanel} browserVisible={!!browserPanel} onImplement={resume} onReview={resume} onParent={id=>open("work-card-report-review",id)}/>:missing;
 case "work-card-close":return phaseId&&workItemId?<WorkCardCloseWorkspace workflowId={workflowId} phaseId={phaseId} workItemId={workItemId} onReturn={()=>open("phase-work-card-selection")}/>:missing;
 case "phase-validation":return phaseId?<PhaseValidationWorkspace workflowId={workflowId} phaseId={phaseId} onNext={()=>terminal("phase-close")} onRepair={props.repair}/>:missing;
 case "phase-close":return phaseId?<PhaseCloseWorkspace workflowId={workflowId} phaseId={phaseId} onValidation={()=>open("phase-validation")} onNext={resume}/>:missing;
 case "project-validation":return <ProjectValidationWorkspace workflowId={workflowId} onNext={()=>terminal("project-close")}/>;
 case "project-close":return <ProjectCloseWorkspace workflowId={workflowId} onNext={props.onReturn}/>;
 case "workflow-hub":return <p role="status">Project Creation is complete. <button type="button" onClick={props.onReturn}>Return to Workflows</button></p>;
 }
}
