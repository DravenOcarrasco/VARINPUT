(async function () {
    /**
     * Function to create a module context with WebSocket, storage, and custom data capabilities.
     * This function returns a context object with methods that allow interaction with WebSocket events, 
     * storage, and custom data management.
     *
     * @param {string} moduleName - The name of the module.
     * @returns {{
    *   MODULE_NAME: string,
    *   SOCKET: object,
    *   KEYBOARD_COMMANDS: Array<object>,
    *   setStorage: (key: string, value: any, isGlobal: boolean) => Promise<object>,
    *   getStorage: (key: string, isGlobal: boolean) => Promise<object>,
    *   getVariable: (variableName: string, defaultValue: any, create: boolean, isGlobal: boolean) => Promise<any>,
    *   showMenu: (options: Array<object>) => void,
    *   getCustomData: (key: string) => any,
    *   setCustomData: (key: string, value: any) => void
    *   setMenuHandler: (handlerFunction: function) => void
    * }} - The context object with methods for WebSocket, storage, and custom data.
   */
    function createContext(moduleName) {
        return window.WSACTION.createModuleContext(moduleName);
    }
    
    // Criar o contexto para o módulo utilizando a função createModuleContext
    const context = createContext("VARINPUT");

    // Variáveis específicas do módulo VARINPUT
    let VARIABLES = []; // Carregar lista de variáveis armazenadas

    /**
     * Adiciona ou atualiza uma variável no armazenamento
     * @param {string} variableName - O nome da variável
     * @param {any} variableValue - O valor da variável
     */
    const addOrUpdateVariable = async (variableName, variableValue) => {
        if (!variableName || !variableValue) {
            console.log('Nome ou valor da variável está vazio. Ignorando.');
            return;
        }

        // Verifica se a variável já existe na lista
        const existingVariable = VARIABLES.find(v => v.name === variableName);
        if (existingVariable) {
            // Atualiza o valor da variável existente
            existingVariable.value = variableValue;
        } else {
            // Adiciona nova variável com nome e valor
            VARIABLES.push({ name: variableName, value: variableValue });
        }

        // Salva a lista de variáveis no armazenamento
        await context.setStorage('VARIABLES', VARIABLES);
    };

    /**
     * Remove uma variável da lista
     * @param {string} variableName - O nome da variável a ser removida
     */
    const removeVariable = async (variableName) => {
        VARIABLES = VARIABLES.filter(v => v.name !== variableName);
        await context.setStorage('VARIABLES', VARIABLES); // Atualiza o armazenamento após a remoção
    };

    /**
     * Obtém a lista de variáveis do armazenamento
     * @returns {Promise<Array>} - A lista de objetos de variáveis { name, value }
     */
    const getVariableList = async () => {
        const storedVariables = await context.getStorage('VARIABLES');
        return storedVariables.success ? storedVariables.value.filter(v => v.name && v.value) : [];
    };

    VARIABLES = await getVariableList();

    /**
     * Mostra, edita e remove variáveis
     */
    const showVariableList = () => {
        const variableList = VARIABLES
            .map(({ name, value }, index) => `
                <div style="margin-bottom: 10px;">
                    <strong>${name}:</strong> ${value}
                    <button onclick="editVariable(${index})" style="margin-left: 10px;">Editar</button>
                    <button onclick="removeVariable(${index})" style="margin-left: 5px;">Remover</button>
                </div>
            `).join('');

        Swal.fire({
            title: 'Lista de Variáveis',
            html: variableList || '<p>Nenhuma variável cadastrada</p>',
            width: 600,
            padding: '3em',
            showConfirmButton: false,
            background: '#fff',
            backdrop: `
                rgba(0,0,123,0.4)
                url("https://sweetalert2.github.io/images/nyan-cat.gif")
                left top
                no-repeat
            `
        });
    };

    /**
     * Função para editar uma variável
     */
    window.editVariable = async (index) => {
        const variable = VARIABLES[index];
        const { value: formValues } = await Swal.fire({
            title: 'Editar Variável',
            html: `
                <input id="swal-input1" class="swal2-input" value="${variable.name}" placeholder="Nome da Variável">
                <input id="swal-input2" class="swal2-input" value="${variable.value}" placeholder="Valor da Variável">
            `,
            focusConfirm: false,
            preConfirm: () => {
                return [
                    document.getElementById('swal-input1').value,
                    document.getElementById('swal-input2').value
                ];
            }
        });

        if (formValues) {
            const [varName, varValue] = formValues;
            if (varName && varValue) {
                await addOrUpdateVariable(varName, varValue);
                Swal.fire(`Variável ${varName} atualizada!`);
                VARIABLES[index] = { name: varName, value: varValue }; // Atualiza localmente
                showVariableList(); // Atualiza a lista
            } else {
                Swal.fire('Preencha ambos os campos');
            }
        }
    };

    /**
     * Função para remover uma variável
     */
    window.removeVariable = async (index) => {
        const variable = VARIABLES[index];
        await removeVariable(variable.name); // Remove da lista e atualiza o armazenamento
        Swal.fire(`Variável ${variable.name} removida!`);
        showVariableList(); // Atualiza a lista após remoção
    };

    /**
     * Função para detectar o framework
     */
    function detectFramework() {
        // Verifica variáveis globais específicas dos frameworks
        if (typeof window.__NEXT_DATA__ !== 'undefined') return 'Next.js';
        if (typeof window.___gatsby !== 'undefined') return 'Gatsby';
        if (typeof window.$nuxt !== 'undefined') return 'Nuxt.js';
        if (typeof window.React !== 'undefined') return 'React';

        // Se não forem encontradas, verifica o conteúdo do <head>
        const headContent = document.head.innerHTML;
        if (headContent.includes('/_next/')) return 'Next.js';
        if (headContent.includes('gatsby') || headContent.includes('/static/')) return 'Gatsby';
        if (headContent.includes('/_nuxt/')) return 'Nuxt.js';
        if (headContent.includes('React')) return 'React';

        return '';
    }

    /**
     * Função para simular a entrada do usuário
     */
    function simulateInput(input, value) {
        if (input.getAttribute('data-programmatically-changed') === 'true') return;

        input.focus();
        switch (detectFramework()) {
            case "React":
            case "Next.js":
            case "Gatsby":
                const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeValueSetter.call(input, value);
                break;
            case "Nuxt.js":
                input.value = value;
                const vueInputEvent = new Event('input', { bubbles: true });
                input.dispatchEvent(vueInputEvent);
                break;
            default:
                input.value = value;
                input.dispatchEvent(new CustomEvent('input', {
                    bubbles: true,
                    cancelable: true,
                    detail: { ignore: true }
                }));
                break;
        }
        input.setAttribute('data-programmatically-changed', 'true');
        setTimeout(() => input.removeAttribute('data-programmatically-changed'), 3000);
    }

    /**
     * Function to get a variable from the VARIABLES array.
     * If the variable doesn't exist, it returns the default value.
     * @param {string} variableName - The name of the variable to find.
     * @param {any} defaultValue - The default value if the variable is not found.
     * @returns {any} - The value of the variable or the default value.
     */
    const getVariableFromList = (variableName, defaultValue) => {
        const variable = VARIABLES.find(v => v.name === variableName);
        return variable ? variable.value : defaultValue;
    };

    // Função para observar mudanças no DOM
    const observeDOMChanges = () => {
        document.body.addEventListener('input', async (event) => {
            const input = event.target;
            if (input.tagName.toLowerCase() === 'input' || input.tagName.toLowerCase() === 'textarea') {
                const value = input.value;
                const variablePattern = /{{(.*?)}}/g;
                let match;
                let newValue = value;
                let hasMatch = false;
                while ((match = variablePattern.exec(value)) !== null) {
                    hasMatch = true;
                    const variableName = match[1];
                    
                    const variableValue = getVariableFromList(variableName) || `{{${variableName}}}`;
                    newValue = newValue.replace(`{{${variableName}}}`, variableValue);
                }

                if (hasMatch) simulateInput(input, newValue);
            }
        });
    };

    // Função para exibir o menu de variáveis
    const showVariableMenu = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Criar Variável',
            html:
                '<input id="swal-input1" class="swal2-input" placeholder="Nome da Variável">' +
                '<input id="swal-input2" class="swal2-input" placeholder="Valor da Variável">',
            focusConfirm: false,
            preConfirm: () => {
                return [
                    document.getElementById('swal-input1').value,
                    document.getElementById('swal-input2').value
                ];
            }
        });

        if (formValues) {
            const [varName, varValue] = formValues;
            if (varName && varValue) {
                await addOrUpdateVariable(varName, varValue);
                Swal.fire(`Variável ${varName} definida para ${varValue}`);
            } else {
                Swal.fire('Preencha ambos os campos');
            }
        }
    };

    // Função para lidar com combinações de teclas
    const handleKeyCombination = (event) => {
        if (event.ctrlKey && event.altKey) {
            if (event.key === 'v') {
                showVariableMenu();
            } else if (event.key === 'l') {
                showVariableList();
            }
        }
    };

    observeDOMChanges();
    document.addEventListener('keydown', handleKeyCombination);

    // Registrar a extensão no contexto global
    if (window.extensionContext) {
        window.extensionContext.addExtension(context.MODULE_NAME, {
            location: window.location,
            ...context
        });
    }
})();