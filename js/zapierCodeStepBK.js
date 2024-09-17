// zapierCodeStepBK.js starts here

const rawResponse = inputData.rawResponse;

const regex = /\{"accounts":\[\{.*?\}\]\}/g;
let match;
let jsonData = [];

while ((match = regex.exec(rawResponse)) !== null) {
    jsonData.push(match[0]);
}

const customLabels = {
    rowIndex: '#',
    accountType: 'Account Type',
    registration: 'Registration',
    title: 'Account Title',
    companyName: 'Firm Name',
    accountNumber: 'Account Number',
    advisorName: 'Advisor Name',
    advisorPhoneNumber: 'Advisor Phone',
    value: 'Account Value',
    beneficiaryYN: 'Has Beneficiary?',
    beneficiaryName: 'Beneficiary Name',
    beneficiaryPhoneNumber: 'Beneficiary Phone',
    bypassProbate: 'Bypass Probate'
};

const customInsuranceLabels = {
    ...customLabels,
    title: 'Policy Title',  // Change this line
    companyName: 'Insurance Company Name',
    accountNumber: 'Policy Number',
    advisorName: 'Agent Name',
    advisorPhoneNumber: 'Agent Phone',
    value: 'Policy Value',
};

const legalDocumentLabels = {
    rowIndex: '#',
    accountType: 'Account Type',
    registration: 'Registration',
    title: 'Document Title',  // Keep using 'title'
    companyName: 'Attorney/CPA Name',
    accountNumber: 'Attorney/CPA Phone',
    advisorName: 'Executor/Trustee Name',
    advisorPhoneNumber: 'Executor/Trustee Phone',
    beneficiaryYN: 'Document Location',  // Use beneficiaryYN for Document Location
    // Remove other beneficiary-related fields
};

const thirdExecutorLabels = {
    rowIndex: '',
    accountType: 'Third Executor',
    registration: 'Third Executor Name',
    title: 'Third Executor Email',
    companyName: '',
    accountNumber: '',
    advisorName: '',
    advisorPhoneNumber: '',
    value: '',
    beneficiaryYN: '',
    beneficiaryName: '',
    beneficiaryPhoneNumber: '',
    bypassProbate: ''
};

// Collect all unique keys from all label objects
const allKeys = new Set([
    ...Object.keys(customLabels),
    ...Object.keys(customInsuranceLabels),
    ...Object.keys(legalDocumentLabels),
    ...Object.keys(thirdExecutorLabels),
]);

// Initialize groupedData with all keys
let groupedData = {};
allKeys.forEach((key) => {
    groupedData[key] = [];
});

function addLabelsForNewType(type) {
    if (!groupedData.accountType.includes(type)) {
        const labels = type === 'Insurance' ? customInsuranceLabels :
                       type === 'Important Legal Documents' ? legalDocumentLabels :
                       type === 'Third Executor' ? thirdExecutorLabels :
                       customLabels;
        Object.keys(groupedData).forEach(key => {
            groupedData[key].push(labels[key] || '');
        });
    }
}

function addEmptyRow() {
    Object.keys(groupedData).forEach(key => {
        groupedData[key].push(key === 'rowIndex' ? '~' : '');
    });
}

function addTwoEmptyRows() {
    addEmptyRow();
    addEmptyRow();
}

let isFirstAccount = true;

jsonData.forEach((data) => {
    let parsedData = JSON.parse(data);
    parsedData.accounts.forEach((account, accIndex) => {
        if (!isFirstAccount) {
            addLabelsForNewType(account.accountType);
        }

        Object.keys(groupedData).forEach(key => {
            let value = account[key] || '';
            if (account.accountType === 'Important Legal Documents') {
                if (key === 'title') {
                    value = account['documentTitle'] || ''; // Use documentTitle for the title field
                } else if (key === 'beneficiaryYN') {
                    value = account['documentLocation'] || ''; // Use documentLocation for the beneficiaryYN field
                } else if (['value', 'beneficiaryName', 'beneficiaryPhoneNumber', 'bypassProbate'].includes(key)) {
                    value = ''; // Set these fields to empty for Legal Documents
                }
            } else if (key === 'bypassProbate') {
                value = account[key] === false ? inputData.unchecked : (account[key] === true ? inputData.checked : '');
            }
            groupedData[key].push(value);
        });

        if (accIndex === parsedData.accounts.length - 1) {
            addTwoEmptyRows();
        }

        isFirstAccount = false;
    });
});

// Extract Third Executor information from rawResponse
const thirdExecutorRegex = /Third Executor Name:([^,]+), Third Executor Email:([^,\s]+)/;
const thirdExecutorMatch = rawResponse.match(thirdExecutorRegex);

// Add Third Executor information
addLabelsForNewType('Third Executor');
groupedData.rowIndex.push('');
groupedData.accountType.push('');
groupedData.registration.push(thirdExecutorMatch ? thirdExecutorMatch[1].trim() : '');
groupedData.title.push(thirdExecutorMatch ? thirdExecutorMatch[2].trim() : '');
Object.keys(groupedData).forEach(key => {
    if (!['rowIndex', 'accountType', 'registration', 'title'].includes(key)) {
        groupedData[key].push('');
    }
});

const dataArray = groupedData.rowIndex.map((_, index) => {
    return Object.keys(groupedData).reduce((acc, key) => {
        acc[key] = groupedData[key][index];
        return acc;
    }, {});
});

return { dataArray };
