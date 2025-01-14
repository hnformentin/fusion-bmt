import React from 'react'
import { ApolloError, gql, useMutation, useQuery } from '@apollo/client'

import { Box } from '@material-ui/core'
import { Button, TextArea } from '@equinor/fusion-components'

import AddNomineeDialog from './AddNomineeDialog'
import { Evaluation, Organization, Participant, Progression, Role } from '../../../api/models'
import NominationTable from './NominationTable'
import { participantCanProgressEvaluation, participantCanAddParticipant } from '../../../utils/RoleBasedAccess'
import { useAzureUniqueId } from '../../../utils/Variables'
import { apiErrorMessage } from '../../../api/error'
import { PARTICIPANT_FIELDS_FRAGMENT } from '../../../api/fragments'

interface NominationViewProps {
    evaluation: Evaluation
    onNextStep: () => void
}

/** Who (Role) can progress Evaluation past Nomination, and when
 *
 * Who:
 *  Facilitators and OrganizationLeads
 *
 * When:
 *  Evaluation is at Nomination stage
 */
const disableProgression = (evaluation: Evaluation, azureUniqueId: string) => {
    if (evaluation.progression !== Progression.Nomination) {
        return true
    }

    const loggedInUser = evaluation.participants.find(p => p.azureUniqueId === azureUniqueId)

    if (!loggedInUser) {
        return true
    }

    return !participantCanProgressEvaluation(loggedInUser.role)
}

/** Who (Role) can add add users, and when (Progression)
 *
 * Who:
 *  Facilitators and OrganizationLeads
 *
 * When:
 *  Any Progression
 */
const disableAddParticipant = (evaluation: Evaluation, azureUniqueId: string) => {
    const loggedInUser = evaluation.participants.find(p => p.azureUniqueId === azureUniqueId)

    if (!loggedInUser) {
        return true
    }

    return !participantCanAddParticipant(loggedInUser.role)
}

const NominationView = ({ evaluation, onNextStep }: NominationViewProps) => {
    const [panelOpen, setPanelOpen] = React.useState(false)
    const { createParticipant, error: errorMutation } = useCreateParticipantMutation()
    const { loading: loadingQuery, participants, error: errorQuery } = useParticipantsQuery(evaluation.id)
    const azureUniqueId = useAzureUniqueId()

    const onNextStepClick = () => {
        onNextStep()
    }

    const onNomineeSelected = (azureUniqueId: string, role: Role, organization: Organization) => {
        createParticipant(azureUniqueId, evaluation.id, organization, role)
    }

    if (loadingQuery) {
        return <>Loading...</>
    }

    if (errorMutation !== undefined) {
        return (
            <div>
                <TextArea value={apiErrorMessage('Could not add participant')} onChange={() => {}} />
            </div>
        )
    }

    if (errorQuery !== undefined || participants === undefined) {
        return (
            <div>
                <TextArea value={apiErrorMessage('Could not load participants')} onChange={() => {}} />
            </div>
        )
    }

    return (
        <div style={{ margin: 20 }}>
            <Box display="flex" flexDirection="row">
                <Box flexGrow={1}>
                    <h2 data-testid="evaluation_title">{evaluation.name}</h2>
                </Box>
                <Box>
                    <Button onClick={onNextStepClick} disabled={disableProgression(evaluation, azureUniqueId)}>
                        Finish Nomination
                    </Button>
                </Box>
            </Box>

            <Button
                onClick={() => {
                    setPanelOpen(true)
                }}
                disabled={disableAddParticipant(evaluation, azureUniqueId)}
            >
                Add Person
            </Button>

            <NominationTable
                participants={participants}
            />

            <AddNomineeDialog
                open={panelOpen}
                onCloseClick={() => setPanelOpen(false)}
                onNomineeSelected={onNomineeSelected}
                currentNominees={participants}
            />
        </div>
    )
}

export default NominationView

interface CreateParticipantMutationProps {
    createParticipant: (azureUniqueId: string, evaluationId: string, organization: Organization, role: Role) => void
    loading: boolean
    participant: Participant | undefined
    error: ApolloError | undefined
}

const useCreateParticipantMutation = (): CreateParticipantMutationProps => {
    const CREATE_PARTICIPANT = gql`
        mutation CreateParticipant($azureUniqueId: String!, $evaluationId: String!, $organization: Organization!, $role: Role!) {
            createParticipant(azureUniqueId: $azureUniqueId, evaluationId: $evaluationId, organization: $organization, role: $role) {
                ...ParticipantFields
            }
        }
        ${PARTICIPANT_FIELDS_FRAGMENT}
    `

    const [createParticipantApolloFunc, { loading, data, error }] = useMutation(CREATE_PARTICIPANT, {
        update(cache, { data: { createParticipant } }) {
            cache.modify({
                fields: {
                    participants(existingParticipants = []) {
                        const newParticipantRef = cache.writeFragment({
                            id: createParticipant.id,
                            data: createParticipant,
                            fragment: PARTICIPANT_FIELDS_FRAGMENT,
                        })
                        return [...existingParticipants, newParticipantRef]
                    },
                },
            })
        },
    })

    const createParticipant = (azureUniqueId: string, evaluationId: string, organization: Organization, role: Role) => {
        createParticipantApolloFunc({ variables: { azureUniqueId, evaluationId, organization, role } })
    }

    return {
        createParticipant: createParticipant,
        loading,
        participant: data?.createParticipant,
        error,
    }
}

interface ParticipantQueryProps {
    loading: boolean
    participants: Participant[] | undefined
    error: ApolloError | undefined
}

const useParticipantsQuery = (evaluationId: string): ParticipantQueryProps => {
    const GET_PARTICIPANTS = gql`
        query {
            participants(where:{evaluation: {id: {eq: "${evaluationId}"}}}) {
                ...ParticipantFields
            }
        }
        ${PARTICIPANT_FIELDS_FRAGMENT}
    `

    const { loading, data, error } = useQuery<{ participants: Participant[] }>(GET_PARTICIPANTS)

    return {
        loading,
        participants: data?.participants,
        error,
    }
}

