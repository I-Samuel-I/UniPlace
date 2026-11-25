from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("accounts", "0002_alter_user_managers")]

    operations = [
        migrations.AddField(
            model_name="user", name="avatar",
            field=models.ImageField(blank=True, upload_to="avatars/"),
        ),
        migrations.AddField(
            model_name="user", name="session_version",
            field=models.PositiveIntegerField(default=0),
        ),
    ]
