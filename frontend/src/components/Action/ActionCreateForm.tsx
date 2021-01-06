import React, { useEffect, useState } from 'react'

import { PersonDetails } from '@equinor/fusion'
import { DatePicker, SearchableDropdown, SearchableDropdownOption, Select } from '@equinor/fusion-components'
import { Button, Icon, TextField, TextFieldProps, Typography } from '@equinor/eds-core-react'
import {
    error_filled
} from '@equinor/eds-icons'

import { Action, Participant, Priority, Question } from '../../api/models'
import { Grid } from '@material-ui/core'
import { barrierToString } from '../../utils/EnumToString'

type TextFieldChangeEvent = React.ChangeEvent<HTMLTextAreaElement> & React.ChangeEvent<HTMLInputElement>

type Validity = Exclude<TextFieldProps['variant'], undefined | "warning">;

const ErrorIconComponent = <Icon size={16} data={error_filled} color="danger" />

const checkIfTitleValid = (title: string) => {
    return title.length > 0
}

const checkIfParticipantValid = (participant: Participant | undefined) => {
    return participant !== undefined
}

interface Props {
    connectedQuestion: Question
    possibleAssignees: Participant[]
    possibleAssigneesDetails: PersonDetails[]
    onActionCreate: (action: Action) => void
    onCancelClick: () => void
}

const ActionCreateForm = ({ connectedQuestion, possibleAssignees, possibleAssigneesDetails, onActionCreate, onCancelClick }: Props) => {
    const [title, setTitle] = useState<string>("")
    const [titleValidity, setTitleValidity] = useState<Validity>("default")

    const [assignedToId, setAssignedToId] = useState<string | undefined>(undefined)
    const assignedTo: Participant | undefined = possibleAssignees.find(a => a.azureUniqueId === assignedToId)
    const [assignedToValidity, setAssignedToValidity] = useState<Validity>("default")

    const [dueDate, setDueDate] = useState<Date>(new Date())
    const [priority, setPriority] = useState<Priority>(Priority.High)
    const [description, setDescription] = useState<string>("")

    const assigneesOptions: SearchableDropdownOption[] = possibleAssigneesDetails.map(personDetails => ({
        title: personDetails.name,
        key: personDetails.azureUniqueId,
        isSelected: personDetails.azureUniqueId === assignedToId
    }))

    useEffect(() => {
        if (titleValidity === "error") {
            if (checkIfTitleValid(title)) {
                setTitleValidity("success")
            }
        }
        else if (titleValidity === "success") {
            if (!checkIfTitleValid(title)) {
                setTitleValidity("error")
            }
        }
    }, [title, titleValidity])

    useEffect(() => {
        if (assignedToValidity === "error") {
            if (checkIfParticipantValid(assignedTo)) {
                setAssignedToValidity("success")
            }
        }
        else if (assignedToValidity === "success") {
            if (!checkIfParticipantValid(assignedTo)) {
                setAssignedToValidity("error")
            }
        }
    }, [assignedTo])

    const onLocalCreateClick = () => {
        const isTitleValid = checkIfTitleValid(title)
        const isParticipantValid = checkIfParticipantValid(assignedTo)
        if(!isTitleValid || !isParticipantValid){
            if(!isTitleValid){
                setTitleValidity("error")
            }
            if(!isParticipantValid){
                setAssignedToValidity("error")
            }
        }
        else {
            const action: Action = {
                id: '',
                title: title,
                assignedTo: assignedTo,
                description: description,
                priority: priority,
                dueDate: dueDate,
                onHold: false,
                createDate: new Date(),
                notes: [],
                question: connectedQuestion
            }
            onActionCreate(action)
        }
    }

    return <>
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <TextField
                    id="title"
                    label="Title"
                    onChange={(event: TextFieldChangeEvent) => setTitle(event.target.value)}
                    variant={titleValidity}
                    helperText={titleValidity === "error" ? "required" : ""}
                    helperIcon={titleValidity === "error" ? ErrorIconComponent : <></>}
                />
            </Grid>
            <Grid item xs={5}>
                <SearchableDropdown
                    label="Assigned to"
                    error={assignedToValidity === "error"}
                    errorMessage="required"
                    options={assigneesOptions}
                    onSelect={option => setAssignedToId(option.key)}
                />
            </Grid>
            <Grid item xs={4}>
                <DatePicker
                    label="Due date"
                    onChange={newDate => setDueDate(newDate !== null ? newDate : new Date())}
                    selectedDate={dueDate}
                />
            </Grid>
            <Grid item xs={3}>
                <Typography group="input" variant="label">Priority</Typography>
                <Select
                    options={[
                        {key: Priority.High, title: "High", isSelected: priority === Priority.High},
                        {key: Priority.Medium, title: "Medium", isSelected: priority === Priority.Medium},
                        {key: Priority.Low, title: "Low", isSelected: priority === Priority.Low}
                    ]}
                    onSelect={option => {
                        setPriority(option.key as Priority)
                    }}
                />
            </Grid>
            <Grid item xs={12}>
                <Typography variant="h5">
                    Connected to {connectedQuestion.evaluation.name}
                </Typography>
                <Typography variant="body_short">
                    {barrierToString(connectedQuestion.barrier)} - {connectedQuestion.text}
                </Typography>
            </Grid>
            <Grid item xs={12}>
                <TextField
                    id="description"
                    multiline
                    label="Description"
                    onChange={(event: TextFieldChangeEvent) => setDescription(event.target.value)}
                    variant="default"
                    style={{height: 150}}
                />
            </Grid>
        </Grid>
        <Grid
            container
            spacing={3}
            justify="flex-end"
        >
            <Grid item>
                <Button
                    variant="outlined"
                    onClick={onCancelClick}
                >
                    Cancel
                </Button>
            </Grid>
            <Grid item>
                <Button onClick={onLocalCreateClick}>
                    Create
                </Button>
            </Grid>
        </Grid>
    </>
}

export default ActionCreateForm