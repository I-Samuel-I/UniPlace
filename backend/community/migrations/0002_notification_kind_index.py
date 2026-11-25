from django.db import migrations, models


def classify_existing(apps, schema_editor):
    notifications = apps.get_model('community', 'Notification').objects.using(schema_editor.connection.alias)
    notifications.filter(url__startswith='/chat/').update(kind='message')
    notifications.filter(url__startswith='/anuncios/').update(kind='post')
    notifications.filter(url='/suporte').update(kind='support')


class Migration(migrations.Migration):
    dependencies = [('community', '0001_initial')]

    operations = [
        migrations.AddField(
            model_name='notification', name='kind',
            field=models.CharField(choices=[('message', 'Mensagens'), ('post', 'Anúncios'), ('support', 'Suporte'), ('system', 'UniPlace')], default='system', max_length=10),
        ),
        migrations.RunPython(classify_existing, migrations.RunPython.noop),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['user', '-created_at', '-id'], name='notice_user_created_idx'),
        ),
    ]
