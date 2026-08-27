pipeline {
    agent any
    environment {
        NEXT_PUBLIC_API_URL = credentials('saturno-front-next-public-api-url')
        WORKDIR = '/var/jenkins_home/workspace/saturno/saturno-front'
    }
    stages {
        stage('Obtener código') {
            steps {
                echo '🔹 STAGE 1: Obteniendo última versión del código'
                sh '''
                cd $WORKDIR
                git pull origin master
                echo "✅ Código actualizado"
                '''
            }
        }

        stage('Determinar color activo') {
            steps {
                script {
                    def active = sh(
                        script: "cat $WORKDIR/.active_color 2>/dev/null || echo blue",
                        returnStdout: true
                    ).trim()
                    env.ACTIVE_COLOR = active
                    env.IDLE_COLOR = (active == 'blue') ? 'green' : 'blue'
                    echo "🔹 Activo actualmente: ${env.ACTIVE_COLOR} — Se desplegará: ${env.IDLE_COLOR}"
                }
            }
        }

        stage('Asegurar Caddy corriendo') {
            steps {
                echo '🔹 STAGE 2: Verificando que Caddy esté arriba'
                sh '''
                cd $WORKDIR
                docker compose up -d --build --remove-orphans caddy
                '''
            }
        }

        stage('Construir imagen') {
            steps {
                echo '🔹 STAGE 3: Construyendo imagen para la instancia idle'
                sh '''
                cd $WORKDIR
                docker compose build --no-cache app-${IDLE_COLOR} \
                    --build-arg NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
                echo "✅ Imagen construida exitosamente"
                '''
            }
        }

        stage('Levantar nueva instancia') {
            steps {
                echo '🔹 STAGE 4: Levantando instancia nueva sin tocar la que sirve tráfico'
                sh '''
                cd $WORKDIR
                docker compose up -d app-${IDLE_COLOR}
                '''
            }
        }

        stage('Esperar healthcheck') {
            steps {
                echo '🔹 STAGE 5: Esperando a que la instancia nueva esté healthy'
                sh '''
                cd $WORKDIR
                for i in $(seq 1 20); do
                    STATUS=$(docker inspect --format='{{.State.Health.Status}}' saturno_front_${IDLE_COLOR} 2>/dev/null || echo "starting")
                    echo "Intento $i/20: $STATUS"
                    if [ "$STATUS" = "healthy" ]; then
                        echo "✅ Instancia ${IDLE_COLOR} healthy"
                        exit 0
                    fi
                    sleep 5
                done
                echo "❌ La instancia ${IDLE_COLOR} no llegó a healthy a tiempo"
                exit 1
                '''
            }
        }

        stage('Cambiar tráfico en Caddy') {
            steps {
                echo '🔹 STAGE 6: Redirigiendo tráfico hacia la instancia nueva'
                sh '''
                cd $WORKDIR
                docker exec saturno_front_caddy sh -c "sed -i 's/saturno_front_${ACTIVE_COLOR}:3004/saturno_front_${IDLE_COLOR}:3004/' /etc/caddy/Caddyfile"
                docker exec saturno_front_caddy caddy reload --config /etc/caddy/Caddyfile
                echo "🚀 Tráfico ahora en ${IDLE_COLOR} — http://161.132.41.248:3004/"
                '''
            }
        }

        stage('Bajar instancia anterior') {
            steps {
                echo '🔹 STAGE 7: Apagando la instancia anterior'
                sh '''
                cd $WORKDIR
                docker compose stop app-${ACTIVE_COLOR} || true
                docker compose rm -f app-${ACTIVE_COLOR} || true
                echo ${IDLE_COLOR} > $WORKDIR/.active_color
                echo "✅ Color activo actualizado a ${IDLE_COLOR}"
                '''
            }
        }
    }

    post {
        failure {
            echo '❌ Pipeline fallido - Revisar logs (la instancia anterior sigue sirviendo tráfico, no hubo downtime)'
        }
        success {
            echo '🎉 ¡Despliegue blue-green exitoso! http://161.132.41.248:3004/'
        }
    }
}
