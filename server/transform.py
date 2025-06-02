# transform.py

import uuid
from pathlib import Path
from fastapi import Body
from email.message import EmailMessage
from email.utils import format_datetime, formataddr
from datetime import datetime, timezone
from llm_analyze import email_handler

# Répertoire où seront stockés les .eml
MAILS_DIR = Path("./mails")
MAILS_DIR.mkdir(parents=True, exist_ok=True)


def format_address_list(address_list):
    """
    Prend une liste de la forme [['Nom', 'adresse@exemple'], …]
    et retourne un string RFC-2822 comme 'Nom <adresse@exemple>, ...'.
    Si la liste est vide, renvoie None.
    """
    if not address_list:
        return None

    formatted = []
    for pair in address_list:
        if len(pair) == 2:
            name, addr = pair
            formatted.append(formataddr((name, addr)))
        else:
            # Si on n'a que l'adresse brute
            formatted.append(pair[0])
    return ", ".join(formatted)


async def transform_email(payload: dict = Body(...)):
    """
    Transforme le JSON reçu en un fichier .eml complet, avec en-têtes originaux,
    date basée sur sent_date (millisecondes), parties text et HTML, et sauvegarde
    dans ./mails/<uuid>.eml. Renvoie l'UUID du fichier créé.
    """
    msg = EmailMessage()

    # 1) Formatage des adresses
    formatted_from  = format_address_list(payload.get("from", []))
    formatted_to    = format_address_list(payload.get("to", []))
    formatted_cc    = format_address_list(payload.get("cc", []))
    formatted_bcc   = format_address_list(payload.get("bcc", []))
    formatted_reply = format_address_list(payload.get("reply_to", []))

    if formatted_from:
        msg["From"] = formatted_from
    if formatted_to:
        msg["To"] = formatted_to
    if formatted_cc:
        msg["Cc"] = formatted_cc
    if formatted_bcc:
        msg["Bcc"] = formatted_bcc
    if formatted_reply:
        msg["Reply-To"] = formatted_reply

    # 2) Sujet
    subject = payload.get("subject", "")
    msg["Subject"] = subject  # L'encodage UTF-8 sera automatique

    # 3) Date (en millisecondes)
    sent_ms = payload.get("sent_date")
    if sent_ms:
        # Conversion en secondes, puis explicitement en UTC puis en fuseau local
        dt = datetime.fromtimestamp(sent_ms / 1000.0, tz=timezone.utc).astimezone()
        msg["Date"] = format_datetime(dt)
    else:
        # À défaut, date courante locale
        now = datetime.now(timezone.utc).astimezone()
        msg["Date"] = format_datetime(now)

    # 4) Original headers (SAUTER "From", "To", "Subject", "Date", "MIME-Version")
    original_headers = payload.get("headers", {})
    for key, value in original_headers.items():
        key_lower = key.lower()
        if key_lower in {"from", "to", "subject", "date", "mime-version"}:
            continue

        if isinstance(value, list):
            for v in value:
                msg.add_header(key, v)
        else:
            msg[key] = value

    # 5) Corps du message en texte brut
    text_body = payload.get("text_preview", "")
    msg.set_content(text_body)

    # 6) Partie HTML (s’il y a un content_type 'text/html' dans attachments)
    for attach in payload.get("attachments", []):
        ct = attach.get("content_type", "")
        if "html" in ct.lower():
            html_content = attach.get("content", "")
            msg.add_alternative(html_content, subtype="html")
            break

    # 7) S'assurer qu'aucune sous-partie n’a son propre "MIME-Version"
    #    (seulement l'en-tête global doit l'inclure)
    for part in msg.iter_parts():
        if part.get("MIME-Version"):
            del part["MIME-Version"]

    # 8) Conversion en bytes (le header MIME-Version global sera généré automatiquement)
    eml_bytes = msg.as_bytes()

    # 9) Génération d’un ID unique et écriture dans ./mails
    unique_id = uuid.uuid4().hex
    filename = f"{unique_id}.eml"
    filepath = MAILS_DIR / filename

    with open(filepath, "wb") as f:
        f.write(eml_bytes)
    with open(filepath, "r") as f:
        raw_email = f.read()
    
    # Call the handler
    analysis = await email_handler(raw_email)
	# Delete the file after processing
    #filepath.unlink()
    print ("Analysis : ",analysis)
    return {
        "status": "success",
        "message": analysis
	}
